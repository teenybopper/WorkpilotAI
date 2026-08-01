"""Shared Intelligence service — cross-source Q&A, conflict detection, case summaries.

Uses ChromaDB (embedded) instead of Qdrant for vector storage.
"""

import logging
from uuid import UUID
from sqlalchemy.orm import Session
import chromadb

from app.config import settings
from app.models import (
    Workspace, Source, Task, Decision, RiskFlag,
    TaskStatus, SourceType,
)
from app.utils.embeddings import generate_embedding
from app.utils.llm import llm_complete, llm_json

logger = logging.getLogger(__name__)


def _get_chroma():
    return chromadb.PersistentClient(path=settings.chroma_dir)


def _get_collection(chroma_client=None):
    client = chroma_client or _get_chroma()
    return client.get_or_create_collection(name=settings.chroma_collection)


def cross_source_query(
    workspace_id: UUID,
    query: str,
    top_k: int = 5,
    source_types: list[str] | None = None,
    db: Session = None,
) -> dict:
    """Cross-source RAG query spanning documents and meetings."""
    query_embedding = generate_embedding(query)

    collection = _get_collection()

    # Build where filter
    where_filter = {"workspace_id": str(workspace_id)}

    if source_types and len(source_types) == 1:
        where_filter["source_type"] = source_types[0]
    elif source_types and len(source_types) > 1:
        where_filter = {
            "$and": [
                {"workspace_id": str(workspace_id)},
                {"source_type": {"$in": source_types}},
            ]
        }

    results = collection.query(
        query_embeddings=[query_embedding],
        where=where_filter,
        n_results=top_k,
    )

    if not results["ids"][0]:
        return {
            "answer": "No relevant information found in this workspace.",
            "evidence": [],
            "confidence": 0.0,
        }

    # Build context with source type labels
    context_parts = []
    evidence = []
    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0] if results.get("distances") else [0.0] * len(documents)

    for doc, meta, dist in zip(documents, metadatas, distances):
        source_label = "📄 Document" if meta.get("source_type") == "document" else "🎙️ Meeting"
        context_parts.append(
            f"[{source_label} — {meta.get('filename', 'unknown')}]: {doc}"
        )
        # ChromaDB returns distance (lower = more similar), convert to score
        score = max(0.0, 1.0 - dist)
        evidence.append({
            "source_id": meta.get("source_id", ""),
            "source_type": meta.get("source_type", ""),
            "filename": meta.get("filename", ""),
            "text": doc,
            "relevance_score": round(score, 3),
        })

    context = "\n\n".join(context_parts)

    prompt = f"""You are a cross-source intelligence assistant. Answer the question using evidence from
both documents and meetings in this workspace. Clearly cite which source (document or meeting)
each piece of information comes from. If there are contradictions between sources, highlight them.

Context (from documents and meetings):
---
{context}
---

Question: {query}

Provide a comprehensive answer with clear source citations."""

    answer = llm_complete(prompt)

    best_score = max((1.0 - d) for d in distances) if distances else 0.0

    return {
        "answer": answer,
        "evidence": evidence,
        "confidence": round(best_score, 3),
    }


def detect_conflicts(workspace_id: UUID, db: Session) -> list[dict]:
    """Detect conflicts between documents and meeting statements in a workspace."""
    sources = db.query(Source).filter(Source.workspace_id == workspace_id).all()

    doc_sources = [s for s in sources if s.source_type == SourceType.DOCUMENT]
    meeting_sources = [s for s in sources if s.source_type == SourceType.MEETING]

    if not doc_sources or not meeting_sources:
        return []

    collection = _get_collection()

    # Get document chunks
    doc_results = collection.get(
        where={
            "$and": [
                {"workspace_id": str(workspace_id)},
                {"source_type": "document"},
            ]
        },
        limit=20,
    )

    if not doc_results["ids"]:
        return []

    conflicts = []
    for i, doc_text in enumerate(doc_results["documents"][:10]):
        doc_meta = doc_results["metadatas"][i]
        doc_embedding = generate_embedding(doc_text)

        # Find related meeting content
        meeting_results = collection.query(
            query_embeddings=[doc_embedding],
            where={
                "$and": [
                    {"workspace_id": str(workspace_id)},
                    {"source_type": "meeting"},
                ]
            },
            n_results=3,
        )

        if not meeting_results["ids"][0]:
            continue

        # Check similarity (distance < 0.5 means reasonably similar)
        if meeting_results["distances"][0][0] > 0.5:
            continue

        meeting_text = meeting_results["documents"][0][0]
        meeting_meta = meeting_results["metadatas"][0][0]

        # Ask LLM to check for conflicts
        conflict_check = llm_json(f"""Compare these two pieces of information and determine if there is a conflict.

Document says: "{doc_text}"

Meeting says: "{meeting_text}"

Return a JSON object with:
- "has_conflict": true/false
- "conflict_description": description of the conflict (empty if no conflict)
- "severity": "low", "medium", or "high"
- "recommendation": what should be done about this conflict
""")

        if conflict_check.get("has_conflict"):
            conflicts.append({
                "document_source": doc_meta.get("filename", ""),
                "document_text": doc_text,
                "meeting_source": meeting_meta.get("filename", ""),
                "meeting_text": meeting_text,
                "description": conflict_check.get("conflict_description", ""),
                "severity": conflict_check.get("severity", "medium"),
                "recommendation": conflict_check.get("recommendation", ""),
            })

    return conflicts


def generate_case_summary(workspace_id: UUID, db: Session) -> dict:
    """Generate a comprehensive case summary for a workspace."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return {"error": "Workspace not found"}

    sources = db.query(Source).filter(Source.workspace_id == workspace_id).all()
    tasks = db.query(Task).filter(Task.workspace_id == workspace_id).all()
    decisions = db.query(Decision).filter(Decision.workspace_id == workspace_id).all()
    risks = db.query(RiskFlag).filter(RiskFlag.workspace_id == workspace_id).all()

    open_tasks = [t for t in tasks if t.status in (TaskStatus.PENDING, TaskStatus.IN_PROGRESS)]

    # Build context for LLM
    context_parts = [f"Workspace: {workspace.name}"]

    if tasks:
        context_parts.append("Tasks:")
        for t in tasks:
            context_parts.append(f"  - [{t.status.value}] {t.text} (Owner: {t.owner or 'unassigned'})")

    if decisions:
        context_parts.append("Decisions:")
        for d in decisions:
            context_parts.append(f"  - {d.text} (Approved by: {d.approver or 'unknown'})")

    if risks:
        context_parts.append("Risk Flags:")
        for r in risks:
            context_parts.append(f"  - [{r.severity.value}] {r.text}")

    context = "\n".join(context_parts)

    summary = llm_complete(
        f"""Generate an executive summary for this workspace.
Include: overview, key outcomes, open items, and risks.

{context}""",
        system_prompt="You are a concise executive summary writer for enterprise operations.",
    )

    # Detect conflicts
    conflicts = detect_conflicts(workspace_id, db)
    conflict_descriptions = [c["description"] for c in conflicts]

    return {
        "workspace_id": str(workspace_id),
        "workspace_name": workspace.name,
        "summary": summary,
        "key_findings": [d.text for d in decisions[:5]],
        "open_tasks": len(open_tasks),
        "unresolved_risks": len(risks),
        "total_decisions": len(decisions),
        "conflicts": conflict_descriptions,
    }
