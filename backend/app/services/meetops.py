"""MeetOps service — transcription, diarization, action extraction, and summaries.

Uses ChromaDB (embedded) instead of Qdrant for vector storage.
"""

import logging
import os
import uuid
from sqlalchemy.orm import Session
import chromadb

from app.config import settings
from app.models import (
    Source, TranscriptSegment, Speaker, Task, Decision,
    RiskFlag, MeetingRequest, SourceStatus, TaskPriority, TaskStatus, RiskSeverity,
)
from app.utils.storage import get_temp_path
from app.utils.embeddings import generate_embeddings, chunk_text
from app.utils.llm import llm_complete, llm_json

logger = logging.getLogger(__name__)


def _get_chroma():
    return chromadb.PersistentClient(path=settings.chroma_dir)


def _get_collection(chroma_client=None):
    client = chroma_client or _get_chroma()
    return client.get_or_create_collection(name=settings.chroma_collection)


def transcribe_audio(source: Source, db: Session) -> list[TranscriptSegment]:
    """Transcribe audio using faster-whisper and return transcript segments."""
    from faster_whisper import WhisperModel

    local_path = get_temp_path(source.storage_path)

    try:
        # Load whisper model (use base for speed, can upgrade later)
        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments_iter, info = model.transcribe(local_path, beam_size=5)

        transcript_segments = []
        for seg in segments_iter:
            ts = TranscriptSegment(
                source_id=source.id,
                start_time=seg.start,
                end_time=seg.end,
                text=seg.text.strip(),
                confidence=seg.avg_logprob,
            )
            db.add(ts)
            transcript_segments.append(ts)

        source.metadata_json = {
            **(source.metadata_json or {}),
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration": info.duration,
        }
        source.status = SourceStatus.READY
        db.commit()

        logger.info(f"Transcribed {source.filename}: {len(transcript_segments)} segments, "
                     f"language={info.language}, duration={info.duration:.1f}s")
        return transcript_segments

    except Exception as e:
        source.status = SourceStatus.FAILED
        db.commit()
        logger.error(f"Transcription failed for {source.filename}: {e}")
        raise


def diarize_audio(source: Source, db: Session) -> list[TranscriptSegment]:
    """Run speaker diarization using pyannote.audio and update transcript segments."""
    from pyannote.audio import Pipeline

    local_path = get_temp_path(source.storage_path)

    try:
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=settings.hf_token,
        )
        diarization = pipeline(local_path)

        # Get existing transcript segments
        segments = db.query(TranscriptSegment).filter(
            TranscriptSegment.source_id == source.id
        ).order_by(TranscriptSegment.start_time).all()

        # Map speakers to segments based on time overlap
        speaker_labels = set()
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            speaker_labels.add(speaker)
            for seg in segments:
                if seg.start_time is not None and seg.end_time is not None:
                    # Check overlap
                    overlap_start = max(seg.start_time, turn.start)
                    overlap_end = min(seg.end_time, turn.end)
                    if overlap_end > overlap_start:
                        seg.speaker_label = speaker

        # Create speaker records
        for label in speaker_labels:
            existing = db.query(Speaker).filter(
                Speaker.workspace_id == source.workspace_id,
                Speaker.label == label,
            ).first()
            if not existing:
                speaker = Speaker(
                    workspace_id=source.workspace_id,
                    label=label,
                    name=label,  # Placeholder, user can rename
                )
                db.add(speaker)

        db.commit()
        logger.info(f"Diarized {source.filename}: {len(speaker_labels)} speakers detected")
        return segments

    except Exception as e:
        logger.error(f"Diarization failed for {source.filename}: {e}")
        raise


def extract_meeting_actions(source: Source, db: Session) -> dict:
    """Extract decisions, tasks, blockers, and risks from meeting transcript using LLM."""
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.source_id == source.id
    ).order_by(TranscriptSegment.start_time).all()

    if not segments:
        return {"tasks": [], "decisions": [], "risks": [], "meeting_requests": []}

    # Build full transcript text
    transcript_text = "\n".join(
        f"[{seg.speaker_label or 'Unknown'} @ {seg.start_time:.1f}s]: {seg.text}"
        if seg.start_time is not None else f"[{seg.speaker_label or 'Unknown'}]: {seg.text}"
        for seg in segments
    )

    prompt = f"""Analyze the following meeting transcript and extract structured information.

Transcript:
---
{transcript_text[:10000]}
---

Return a JSON object with:
- "tasks": array of objects with "text", "owner" (if mentioned), "due_date" (if mentioned), "priority" (low/medium/high/critical), "evidence" (exact quote)
- "decisions": array of objects with "text", "approver" (the speaker who made/approved it), "evidence" (exact quote), "confidence" (0-1)
- "risks": array of objects with "text", "severity" (low/medium/high/critical), "evidence" (exact quote)
- "meeting_requests": array of objects with "title", "participants" (array or string), "proposed_time" (e.g., "Next Tuesday at 2 PM"), "purpose" (agenda/reason for meeting), "evidence" (exact quote), "confidence" (0-1)
- "summary": a 2-3 paragraph summary of the meeting
- "key_topics": array of main topics discussed
- "unresolved_questions": array of questions that were raised but not answered
"""

    result = llm_json(prompt)

    # Store tasks
    tasks = []
    for t in result.get("tasks", []):
        priority_map = {"low": TaskPriority.LOW, "medium": TaskPriority.MEDIUM,
                        "high": TaskPriority.HIGH, "critical": TaskPriority.CRITICAL}
        task = Task(
            workspace_id=source.workspace_id,
            source_id=source.id,
            text=t.get("text", ""),
            owner=t.get("owner"),
            priority=priority_map.get(t.get("priority", "medium"), TaskPriority.MEDIUM),
            status=TaskStatus.PENDING,
            evidence_text=t.get("evidence"),
            confidence=t.get("confidence", 0.7),
        )
        db.add(task)
        tasks.append(task)

    # Store decisions
    decisions = []
    for d in result.get("decisions", []):
        decision = Decision(
            workspace_id=source.workspace_id,
            source_id=source.id,
            text=d.get("text", ""),
            approver=d.get("approver"),
            confidence=d.get("confidence", 0.7),
            evidence_text=d.get("evidence"),
        )
        db.add(decision)
        decisions.append(decision)

    # Store risk flags
    risks = []
    for r in result.get("risks", []):
        severity_map = {"low": RiskSeverity.LOW, "medium": RiskSeverity.MEDIUM,
                        "high": RiskSeverity.HIGH, "critical": RiskSeverity.CRITICAL}
        risk = RiskFlag(
            workspace_id=source.workspace_id,
            source_id=source.id,
            text=r.get("text", ""),
            severity=severity_map.get(r.get("severity", "medium"), RiskSeverity.MEDIUM),
            evidence_text=r.get("evidence"),
        )
        db.add(risk)
        risks.append(risk)

    # Store follow-up meeting requests
    meeting_requests = []
    for mr in result.get("meeting_requests", []):
        participants_val = mr.get("participants")
        if isinstance(participants_val, list):
            participants_str = ", ".join(str(p) for p in participants_val)
        else:
            participants_str = str(participants_val) if participants_val else None

        req = MeetingRequest(
            workspace_id=source.workspace_id,
            source_id=source.id,
            title=mr.get("title", "Follow-up Meeting"),
            participants=participants_str,
            proposed_time=mr.get("proposed_time"),
            purpose=mr.get("purpose"),
            evidence_text=mr.get("evidence"),
            confidence=mr.get("confidence", 0.8),
            status="pending",
        )
        db.add(req)
        meeting_requests.append(req)

    db.commit()

    logger.info(f"Extracted from {source.filename}: {len(tasks)} tasks, "
                 f"{len(decisions)} decisions, {len(risks)} risks, {len(meeting_requests)} meeting requests")

    return {
        "tasks": tasks,
        "decisions": decisions,
        "risks": risks,
        "meeting_requests": meeting_requests,
        "summary": result.get("summary", ""),
        "key_topics": result.get("key_topics", []),
        "unresolved_questions": result.get("unresolved_questions", []),
    }


def index_transcript_chunks(source: Source, db: Session):
    """Chunk transcript text, generate embeddings, and store in ChromaDB."""
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.source_id == source.id
    ).order_by(TranscriptSegment.start_time).all()

    if not segments:
        return

    # Combine segments into full text
    full_text = " ".join(seg.text for seg in segments)
    chunks = chunk_text(full_text, chunk_size=512, overlap=64)
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
            "source_type": "meeting",
            "filename": source.filename,
            "chunk_index": i,
        })

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=emb_list,
        metadatas=metadatas,
    )
    logger.info(f"Indexed {len(ids)} transcript chunks from {source.filename}")


def generate_meeting_summary(source: Source, db: Session) -> dict:
    """Generate a comprehensive meeting summary."""
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.source_id == source.id
    ).order_by(TranscriptSegment.start_time).all()

    if not segments:
        return {"summary": "No transcript available.", "duration_seconds": 0,
                "speaker_count": 0, "action_count": 0, "decision_count": 0}

    transcript_text = "\n".join(
        f"[{seg.speaker_label or 'Unknown'}]: {seg.text}" for seg in segments
    )

    summary = llm_complete(
        f"""Provide a clear, structured summary of this meeting transcript.
Include: main topics discussed, key outcomes, and next steps.

Transcript:
---
{transcript_text[:10000]}
---""",
        system_prompt="You are a professional meeting summarizer. Be concise but thorough.",
    )

    speakers = set(seg.speaker_label for seg in segments if seg.speaker_label)
    duration = max((seg.end_time or 0) for seg in segments) if segments else 0
    task_count = db.query(Task).filter(Task.source_id == source.id).count()
    decision_count = db.query(Decision).filter(Decision.source_id == source.id).count()

    return {
        "source_id": str(source.id),
        "summary": summary,
        "duration_seconds": duration,
        "speaker_count": len(speakers),
        "action_count": task_count,
        "decision_count": decision_count,
    }
