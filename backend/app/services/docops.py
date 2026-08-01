"""DocOps service — document parsing, extraction, comparison, and query.

Uses ChromaDB (embedded) instead of Qdrant for vector storage.
Uses local filesystem instead of MinIO for file storage.
"""

import logging
import os
import json
import uuid
import difflib
from uuid import UUID
from sqlalchemy.orm import Session
import chromadb

from app.config import settings
from app.models import Source, DocumentVersion, Entity, SourceStatus
from app.utils.storage import get_file_path
from app.utils.embeddings import generate_embeddings, generate_embedding, chunk_text
from app.utils.llm import llm_complete, llm_json

logger = logging.getLogger(__name__)


def _get_chroma():
    return chromadb.PersistentClient(path=settings.chroma_dir)


def _get_collection(chroma_client=None):
    client = chroma_client or _get_chroma()
    return client.get_or_create_collection(name=settings.chroma_collection)


def parse_document(source: Source, db: Session) -> DocumentVersion:
    """Parse a document using Docling and store the extracted version."""
    from docling.document_converter import DocumentConverter

    # Get file path from local storage
    local_path = get_file_path(source.storage_path)

    try:
        converter = DocumentConverter()
        result = converter.convert(local_path)

        # Get the full extracted text
        extracted_text = result.document.export_to_markdown()

        # Extract tables if present
        tables = []
        for table in result.document.tables:
            tables.append({
                "content": table.export_to_markdown() if hasattr(table, "export_to_markdown") else str(table),
            })

        # Create document version
        doc_version = DocumentVersion(
            source_id=source.id,
            version_num=1,
            extracted_text=extracted_text,
            tables_json=tables if tables else None,
            metadata_json={
                "page_count": len(result.document.pages) if hasattr(result.document, "pages") else None,
                "parser": "docling",
            },
        )
        db.add(doc_version)

        # Update source status
        source.status = SourceStatus.READY
        db.commit()
        db.refresh(doc_version)

        logger.info(f"Parsed document {source.filename}: {len(extracted_text)} chars extracted")
        return doc_version

    except Exception as e:
        source.status = SourceStatus.FAILED
        db.commit()
        logger.error(f"Failed to parse document {source.filename}: {e}")
        raise


def extract_entities(source: Source, doc_version: DocumentVersion, db: Session) -> list[Entity]:
    """Extract entities (people, dates, amounts, deadlines, clauses) from document text using LLM."""
    text = doc_version.extracted_text
    if not text:
        return []

    # Truncate very long texts for the LLM call
    text_for_llm = text[:8000]

    prompt = f"""Analyze the following document text and extract all important entities.
Return a JSON object with an "entities" array where each entity has:
- "type": one of "person", "date", "amount", "deadline", "clause", "organization", "obligation"
- "value": the extracted value
- "context": a brief surrounding context (1-2 sentences)

Document text:
---
{text_for_llm}
---

Return the JSON object with the "entities" array."""

    result = llm_json(prompt)
    entities_data = result.get("entities", [])

    entities = []
    for ent in entities_data:
        entity = Entity(
            source_id=source.id,
            entity_type=ent.get("type", "unknown"),
            value=ent.get("value", ""),
            context=ent.get("context", ""),
        )
        db.add(entity)
        entities.append(entity)

    db.commit()
    logger.info(f"Extracted {len(entities)} entities from {source.filename}")
    return entities


def index_document_chunks(source: Source, doc_version: DocumentVersion):
    """Chunk document text, generate embeddings, and store in ChromaDB."""
    text = doc_version.extracted_text
    if not text:
        return

    chunks = chunk_text(text, chunk_size=512, overlap=64)
    if not chunks:
        return

    embeddings = generate_embeddings(chunks)

    collection = _get_collection()

    ids = []
    documents = []
    emb_list = []
    metadatas = []

    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_id = str(uuid.uuid4())
        ids.append(chunk_id)
        documents.append(chunk)
        emb_list.append(embedding)
        metadatas.append({
            "source_id": str(source.id),
            "workspace_id": str(source.workspace_id),
            "source_type": "document",
            "filename": source.filename,
            "chunk_index": i,
        })

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=emb_list,
        metadatas=metadatas,
    )
    logger.info(f"Indexed {len(ids)} chunks from {source.filename}")


def compare_documents(source_a: Source, source_b: Source, db: Session) -> dict:
    """Compare two document versions and return section-level diffs."""
    # Get latest versions
    version_a = db.query(DocumentVersion).filter(
        DocumentVersion.source_id == source_a.id
    ).order_by(DocumentVersion.version_num.desc()).first()

    version_b = db.query(DocumentVersion).filter(
        DocumentVersion.source_id == source_b.id
    ).order_by(DocumentVersion.version_num.desc()).first()

    if not version_a or not version_b:
        return {"error": "One or both documents have not been extracted yet"}

    text_a = version_a.extracted_text or ""
    text_b = version_b.extracted_text or ""

    # Generate diff
    diff = difflib.unified_diff(
        text_a.splitlines(keepends=True),
        text_b.splitlines(keepends=True),
        fromfile=source_a.filename,
        tofile=source_b.filename,
        lineterm="",
    )
    diff_text = "\n".join(diff)

    # Use LLM to summarize differences
    prompt = f"""You are analyzing the differences between two versions of a document.

Document A: {source_a.filename}
Document B: {source_b.filename}

Diff:
---
{diff_text[:6000]}
---

Provide a JSON response with:
- "summary": a brief overview of the changes
- "additions": array of key additions in document B
- "removals": array of key removals from document A
- "modifications": array of significant modifications
- "risk_flags": array of any concerning changes
"""

    analysis = llm_json(prompt)
    analysis["diff_text"] = diff_text[:5000]
    return analysis


def query_documents(workspace_id: UUID, query: str, top_k: int, db: Session) -> dict:
    """RAG-based query over workspace documents using ChromaDB."""
    # Generate query embedding
    query_embedding = generate_embedding(query)

    collection = _get_collection()

    # Search ChromaDB
    results = collection.query(
        query_embeddings=[query_embedding],
        where={
            "$and": [
                {"workspace_id": str(workspace_id)},
                {"source_type": "document"},
            ]
        },
        n_results=top_k,
    )

    if not results["ids"][0]:
        return {
            "answer": "No relevant documents found in this workspace.",
            "evidence": [],
            "confidence": 0.0,
        }

    # Build context from search results
    context_parts = []
    evidence = []
    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0] if results.get("distances") else [0.0] * len(documents)

    for doc, meta, dist in zip(documents, metadatas, distances):
        context_parts.append(f"[{meta.get('filename', 'unknown')}]: {doc}")
        score = max(0.0, 1.0 - dist)
        evidence.append({
            "source_id": meta.get("source_id", ""),
            "source_type": meta.get("source_type", ""),
            "filename": meta.get("filename", ""),
            "text": doc,
            "relevance_score": round(score, 3),
        })

    context = "\n\n".join(context_parts)

    prompt = f"""Answer the following question based ONLY on the provided document context.
If the context doesn't contain enough information to answer, say so clearly.
Cite the specific document(s) you reference.

Context:
---
{context}
---

Question: {query}

Provide a clear, accurate answer with document citations."""

    answer = llm_complete(prompt)

    best_score = max((1.0 - d) for d in distances) if distances else 0.0

    return {
        "answer": answer,
        "evidence": evidence,
        "confidence": round(best_score, 3),
    }
