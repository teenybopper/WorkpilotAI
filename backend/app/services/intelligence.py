"""Shared Intelligence service — cross-source Q&A, conflict detection, case summaries."""

import logging
from uuid import UUID
from sqlalchemy.orm import Session
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

from app.config import settings
from app.models import (
    Workspace, Source, Task, Decision, RiskFlag,
    TaskStatus, SourceType,
)
from app.utils.embeddings import generate_embedding
from app.utils.llm import llm_complete, llm_json

logger = logging.getLogger(__name__)


def _get_qdrant() -> QdrantClient:
    return QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)


def _ensure_collection(qdrant: QdrantClient):
    collections = [c.name for c in qdrant.get_collections().collections]
    if settings.qdrant_collection not in collections:
        qdrant.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )


def cross_source_query(
    workspace_id: UUID,
    query: str,
    top_k: int = 5,
    source_types: list[str] | None = None,
    db: Session = None,
) -> dict:
    """Cross-source RAG query spanning documents and meetings."""
    query_embedding = generate_embedding(query)

    qdrant = _get_qdrant()
    _ensure_collection(qdrant)

    # Build filter
    must_filters = [
        {"key": "workspace_id", "match": {"value": str(workspace_id)}},
    ]

    # Filter by source types if specified
    if source_types:
        must_filters.append({
            "key": "source_type",
            "match": {"any": source_types},
        })

    results = qdrant.search(
        collection_name=settings.qdrant_collection,
        query_vector=query_embedding,
        query_filter={"must": must_filters},
        limit=top_k,
    )

    if not results:
        return {
            "answer": "No relevant information found in this workspace.",
            "evidence": [],
            "confidence": 0.0,
        }

    # Build context with source type labels
    context_parts = []
    evidence = []
    for r in results:
        source_label = "📄 Document" if r.payload["source_type"] == "document" else "🎙️ Meeting"
        context_parts.append(
            f"[{source_label} — {r.payload['filename']}]: {r.payload['text']}"
        )
        evidence.append({
            "source_id": r.payload["source_id"],
            "source_type": r.payload["source_type"],
            "filename": r.payload["filename"],
            "text": r.payload["text"],
            "relevance_score": round(r.score, 3),
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

    return {
        "answer": answer,
        "evidence": evidence,
        "confidence": round(max(r.score for r in results), 3),
    }


def detect_conflicts(workspace_id: UUID, db: Session) -> list[dict]:
    """Detect conflicts between documents and meeting statements in a workspace."""
    # Get all sources in the workspace
    sources = db.query(Source).filter(Source.workspace_id == workspace_id).all()

    doc_sources = [s for s in sources if s.source_type == SourceType.DOCUMENT]
    meeting_sources = [s for s in sources if s.source_type == SourceType.MEETING]

    if not doc_sources or not meeting_sources:
        return []

    # Use cross-source search to find potentially conflicting information
    qdrant = _get_qdrant()
    _ensure_collection(qdrant)

    # Get document chunks
    doc_results = qdrant.scroll(
        collection_name=settings.qdrant_collection,
        scroll_filter={
            "must": [
                {"key": "workspace_id", "match": {"value": str(workspace_id)}},
                {"key": "source_type", "match": {"value": "document"}},
            ]
        },
        limit=20,
    )

    doc_chunks = doc_results[0] if doc_results else []

    if not doc_chunks:
        return []

    # For each key doc chunk, find related meeting content
    conflicts = []
    for doc_point in doc_chunks[:10]:  # Limit to avoid too many LLM calls
        doc_text = doc_point.payload["text"]
        doc_embedding = generate_embedding(doc_text)

        meeting_results = qdrant.search(
            collection_name=settings.qdrant_collection,
            query_vector=doc_embedding,
            query_filter={
                "must": [
                    {"key": "workspace_id", "match": {"value": str(workspace_id)}},
                    {"key": "source_type", "match": {"value": "meeting"}},
                ]
            },
            limit=3,
        )

        if not meeting_results or meeting_results[0].score < 0.5:
            continue

        meeting_text = meeting_results[0].payload["text"]

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
                "document_source": doc_point.payload["filename"],
                "document_text": doc_text,
                "meeting_source": meeting_results[0].payload["filename"],
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
