"""Meeting API router — upload, transcribe, diarize, extract actions, and summaries."""

import uuid
import logging
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Source, TranscriptSegment, SourceType, SourceStatus
from app.schemas import (
    SourceResponse, MeetingTranscribeRequest, MeetingExtractActionsRequest,
    MeetingSummaryResponse, TranscriptSegmentResponse,
)
from app.services.meetops import (
    transcribe_audio, diarize_audio, extract_meeting_actions,
    index_transcript_chunks, generate_meeting_summary,
)
from app.utils.storage import upload_file, ensure_bucket

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/meetings", tags=["Meetings"])


@router.post("/upload", response_model=SourceResponse)
async def upload_meeting(
    file: UploadFile = File(...),
    workspace_id: str = Form(...),
    db: Session = Depends(get_db),
):
    """Upload a meeting audio file (WAV, MP3, M4A, OGG, WebM) or transcript."""
    ensure_bucket()

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    content_type = file.content_type or "application/octet-stream"
    object_name = f"meetings/{workspace_id}/{uuid.uuid4()}_{file.filename}"
    storage_path = upload_file(object_name, content, content_type)

    source = Source(
        workspace_id=uuid.UUID(workspace_id),
        source_type=SourceType.MEETING,
        filename=file.filename,
        storage_path=storage_path,
        mime_type=content_type,
        file_size=len(content),
        status=SourceStatus.UPLOADED,
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    logger.info(f"Meeting uploaded: {file.filename} -> {storage_path}")
    return source


@router.post("/transcribe")
async def transcribe_meeting(
    request: MeetingTranscribeRequest,
    db: Session = Depends(get_db),
):
    """Transcribe a meeting audio file using faster-whisper."""
    source = db.query(Source).filter(Source.id == request.source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    if source.source_type != SourceType.MEETING:
        raise HTTPException(status_code=400, detail="Source is not a meeting")

    source.status = SourceStatus.PROCESSING
    db.commit()

    try:
        segments = transcribe_audio(source, db)
        # Index transcript chunks in Qdrant
        index_transcript_chunks(source, db)

        return {
            "source_id": str(source.id),
            "status": "ready",
            "segments_count": len(segments),
            "language": (source.metadata_json or {}).get("language", "unknown"),
            "duration": (source.metadata_json or {}).get("duration", 0),
        }
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/diarize")
async def diarize_meeting(
    request: MeetingTranscribeRequest,
    db: Session = Depends(get_db),
):
    """Run speaker diarization on a transcribed meeting."""
    source = db.query(Source).filter(Source.id == request.source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    try:
        segments = diarize_audio(source, db)
        speakers = set(s.speaker_label for s in segments if s.speaker_label)

        return {
            "source_id": str(source.id),
            "speakers_detected": len(speakers),
            "speaker_labels": list(speakers),
            "segments_updated": len(segments),
        }
    except Exception as e:
        logger.error(f"Diarization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Diarization failed: {str(e)}")


@router.post("/extract-actions")
async def extract_actions(
    request: MeetingExtractActionsRequest,
    db: Session = Depends(get_db),
):
    """Extract decisions, tasks, blockers, and risks from a meeting transcript."""
    source = db.query(Source).filter(Source.id == request.source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    result = extract_meeting_actions(source, db)

    return {
        "source_id": str(source.id),
        "tasks_extracted": len(result.get("tasks", [])),
        "decisions_extracted": len(result.get("decisions", [])),
        "risks_extracted": len(result.get("risks", [])),
        "summary": result.get("summary", ""),
        "key_topics": result.get("key_topics", []),
        "unresolved_questions": result.get("unresolved_questions", []),
    }


@router.get("/{source_id}/summary")
async def get_meeting_summary(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Get a comprehensive meeting summary."""
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    return generate_meeting_summary(source, db)


@router.get("/{source_id}/transcript", response_model=list[TranscriptSegmentResponse])
async def get_transcript(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Get all transcript segments for a meeting."""
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.source_id == source_id
    ).order_by(TranscriptSegment.start_time).all()

    return segments
