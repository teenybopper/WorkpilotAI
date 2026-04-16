"""DocOps service — document parsing, extraction, comparison, and query."""

import logging
import os
import json
import difflib
from uuid import UUID
from sqlalchemy.orm import Session
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance

from app.config import settings
from app.models import Source, DocumentVersion, Entity, SourceStatus
from app.utils.storage import download_file, get_temp_path
from app.utils.embeddings import generate_embeddings, generate_embedding, chunk_text
from app.utils.llm import llm_complete, llm_json

logger = logging.getLogger(__name__)


def _get_qdrant() -> QdrantClient:
    return QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)


def _ensure_collection(qdrant: QdrantClient):
    """Create the Qdrant collection if it doesn't exist."""
    collections = [c.name for c in qdrant.get_collections().collections]
    if settings.qdrant_collection not in collections:
        qdrant.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
        logger.info(f"Created Qdrant collection: {settings.qdrant_collection}")


def parse_document(source: Source, db: Session) -> DocumentVersion:
    """Parse a document using Docling and store the extracted version."""
    from docling.document_converter import DocumentConverter

    # Download file from MinIO to temp path
    object_name = source.storage_path.split("/", 1)[1]  # Remove bucket prefix
    local_path = get_temp_path(object_name)

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
    finally:
        # Cleanup temp file
        if os.path.exists(local_path):
            os.remove(local_path)


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
    """Chunk document text, generate embeddings, and store in Qdrant."""
    text = doc_version.extracted_text
    if not text:
        return

    chunks = chunk_text(text, chunk_size=512, overlap=64)
    if not chunks:
        return

    embeddings = generate_embeddings(chunks)

    qdrant = _get_qdrant()
    _ensure_collection(qdrant)

    import uuid
    points = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        points.append(PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                "text": chunk,
                "source_id": str(source.id),
                "workspace_id": str(source.workspace_id),
                "source_type": "document",
                "filename": source.filename,
                "chunk_index": i,
            },
        ))

    qdrant.upsert(collection_name=settings.qdrant_collection, points=points)
    logger.info(f"Indexed {len(points)} chunks from {source.filename}")


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
    """RAG-based query over workspace documents."""
    # Generate query embedding
    query_embedding = generate_embedding(query)

    # Search Qdrant
    qdrant = _get_qdrant()
    _ensure_collection(qdrant)

    results = qdrant.search(
        collection_name=settings.qdrant_collection,
        query_vector=query_embedding,
        query_filter={
            "must": [
                {"key": "workspace_id", "match": {"value": str(workspace_id)}},
                {"key": "source_type", "match": {"value": "document"}},
            ]
        },
        limit=top_k,
    )

    if not results:
        return {
            "answer": "No relevant documents found in this workspace.",
            "evidence": [],
            "confidence": 0.0,
        }

    # Build context from search results
    context_parts = []
    evidence = []
    for r in results:
        context_parts.append(f"[{r.payload['filename']}]: {r.payload['text']}")
        evidence.append({
            "source_id": r.payload["source_id"],
            "source_type": r.payload["source_type"],
            "filename": r.payload["filename"],
            "text": r.payload["text"],
            "relevance_score": round(r.score, 3),
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

    return {
        "answer": answer,
        "evidence": evidence,
        "confidence": round(max(r.score for r in results), 3) if results else 0.0,
    }
