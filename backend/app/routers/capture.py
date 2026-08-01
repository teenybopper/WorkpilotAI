"""Capture router — audio chunk uploads for local capture and file uploads."""

import logging
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MeetingCaptureMode
from app.services.capture_service import (
    create_capture_session, receive_audio_chunk,
    process_keepalive, finalize_session, get_session_status,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/capture", tags=["Audio Capture"])


class CaptureSessionCreate(BaseModel):
    workspace_id: str
    capture_mode: str = "local_listener"
    title: Optional[str] = None
    consent_given: bool = True
    device_token: Optional[str] = None
    platform: Optional[str] = None


def process_finalized_session(session_id: str, db_session_factory):
    """Background task to merge chunks, transcribe, index, and extract actions."""
    from app.models import Source, MeetingSession, SessionStatus, SourceStatus
    from app.utils.storage import merge_chunks
    from app.services.meetops import (
        transcribe_audio, index_transcript_chunks, extract_meeting_actions
    )
    
    db = db_session_factory()
    try:
        session = db.query(MeetingSession).filter(MeetingSession.id == session_id).first()
        if not session or not session.source_id:
            logger.error(f"Cannot process session {session_id}: session or source_id not found")
            return
        
        source = db.query(Source).filter(Source.id == session.source_id).first()
        if not source:
            logger.error(f"Cannot process session {session_id}: source record not found")
            return
        
        # 1. Merge chunks
        try:
            logger.info(f"Merging chunks for session {session_id}...")
            merged_path = merge_chunks(session.workspace_id, session_id, "recording.wav")
            source.storage_path = merged_path
            source.status = SourceStatus.PROCESSING
            db.commit()
        except Exception as e:
            logger.error(f"Failed to merge chunks for session {session_id}: {e}")
            source.status = SourceStatus.FAILED
            session.status = SessionStatus.FAILED
            db.commit()
            return
        
        # 2. Transcribe
        try:
            logger.info(f"Transcribing session {session_id}...")
            transcribe_audio(source, db)
        except Exception as e:
            logger.error(f"Failed to transcribe session {session_id}: {e}")
            source.status = SourceStatus.FAILED
            session.status = SessionStatus.FAILED
            db.commit()
            return
        
        # 3. Index transcript chunks in ChromaDB
        try:
            logger.info(f"Indexing transcript chunks for session {session_id}...")
            index_transcript_chunks(source, db)
        except Exception as e:
            logger.error(f"Failed to index transcript chunks for session {session_id}: {e}")
        
        # 4. Extract actions
        try:
            logger.info(f"Extracting actions for session {session_id}...")
            extract_meeting_actions(source, db)
        except Exception as e:
            logger.error(f"Failed to extract actions for session {session_id}: {e}")
        
        # Mark session as completed
        session.status = SessionStatus.COMPLETED
        db.commit()
        logger.info(f"Session {session_id} processed successfully!")
    except Exception as e:
        logger.error(f"Error in background processing for session {session_id}: {e}")
    finally:
        db.close()


@router.post("/session")
async def create_session(
    request: CaptureSessionCreate,
    db: Session = Depends(get_db),
):
    """Create a new capture session."""
    try:
        mode = MeetingCaptureMode(request.capture_mode)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid capture mode: {request.capture_mode}")

    try:
        session = create_capture_session(
            workspace_id=request.workspace_id,
            capture_mode=mode,
            db=db,
            title=request.title,
            consent_given=request.consent_given,
            platform=request.platform,
        )
        return {
            "session_id": str(session.id),
            "status": session.status.value,
            "chunks_received": session.chunks_received or 0,
            "created_at": session.created_at.isoformat() if session.created_at else None,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/session/{session_id}/chunk")
async def upload_chunk(
    session_id: str,
    chunk_index: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload an audio chunk for a capture session."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty chunk")

    try:
        chunks_count = receive_audio_chunk(session_id, content, chunk_index, db)
        return {
            "session_id": session_id,
            "chunk_index": chunk_index,
            "chunks_received": chunks_count,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/session/{session_id}/keepalive")
async def keepalive(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Send a keep-alive heartbeat for a capture session."""
    try:
        session = process_keepalive(session_id, db)
        return {
            "session_id": session_id,
            "status": session.status.value,
            "chunks_received": session.chunks_received or 0,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/session/{session_id}/finalize")
async def finalize(
    session_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Finalize a capture session — triggers processing pipeline."""
    try:
        session = finalize_session(session_id, db)
        
        # Trigger background processing
        from app.database import SessionLocal
        background_tasks.add_task(
            process_finalized_session,
            session_id=str(session.id),
            db_session_factory=SessionLocal
        )
        
        return {
            "session_id": session_id,
            "status": session.status.value,
            "source_id": str(session.source_id) if session.source_id else None,
            "chunks_received": session.chunks_received or 0,
            "duration_seconds": session.duration_seconds,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/session/{session_id}/status")
async def session_status(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Get the current status of a capture session."""
    session = get_session_status(session_id, db)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": str(session.id),
        "status": session.status.value,
        "capture_mode": session.capture_mode.value,
        "chunks_received": session.chunks_received or 0,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "duration_seconds": session.duration_seconds,
        "source_id": str(session.source_id) if session.source_id else None,
    }
