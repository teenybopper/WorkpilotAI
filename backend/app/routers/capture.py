"""Capture router — audio chunk uploads from local companion and org bot service."""

import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MeetingCaptureMode
from app.schemas import (
    CaptureSessionCreateRequest, CaptureSessionResponse,
    CaptureKeepAliveRequest, CaptureSessionStatusResponse,
    MeetingCaptureModeEnum, SessionStatusEnum,
)
from app.services.capture_service import (
    create_capture_session, receive_audio_chunk,
    process_keepalive, finalize_session, get_session_status,
    verify_device_token, verify_bot_token,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/capture", tags=["Audio Capture"])


@router.post("/session", response_model=CaptureSessionResponse)
async def create_session(
    request: CaptureSessionCreateRequest,
    db: Session = Depends(get_db),
):
    """Create a new capture session from a local companion or org bot service."""
    device_id = None
    bot_token_id = None

    # Authenticate the caller
    if request.device_token:
        device = verify_device_token(db, request.device_token)
        if not device:
            raise HTTPException(status_code=401, detail="Invalid device token")
        device_id = device.id
    elif request.bot_token:
        token = verify_bot_token(db, request.bot_token)
        if not token:
            raise HTTPException(status_code=401, detail="Invalid bot service token")
        bot_token_id = token.id
    else:
        raise HTTPException(status_code=400, detail="Either device_token or bot_token is required")

    try:
        session = create_capture_session(
            workspace_id=request.workspace_id,
            capture_mode=MeetingCaptureMode(request.capture_mode.value),
            db=db,
            title=request.title,
            platform=request.platform,
            meeting_url=request.meeting_url,
            consent_given=request.consent_given,
            device_id=device_id,
            bot_service_token_id=bot_token_id,
            provider_session_id=request.provider_session_id,
        )
        return CaptureSessionResponse(
            session_id=session.id,
            status=SessionStatusEnum(session.status.value),
            chunks_received=session.chunks_received or 0,
            created_at=session.created_at,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/session/{session_id}/chunk")
async def upload_chunk(
    session_id: UUID,
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
            "session_id": str(session_id),
            "chunk_index": chunk_index,
            "chunks_received": chunks_count,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/session/{session_id}/keepalive")
async def keepalive(
    session_id: UUID,
    request: CaptureKeepAliveRequest = None,
    db: Session = Depends(get_db),
):
    """Send a keep-alive heartbeat for a capture session."""
    try:
        session = process_keepalive(session_id, db)
        return {
            "session_id": str(session_id),
            "status": session.status.value,
            "chunks_received": session.chunks_received or 0,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/session/{session_id}/finalize")
async def finalize(
    session_id: UUID,
    db: Session = Depends(get_db),
):
    """Finalize a capture session — triggers processing pipeline."""
    try:
        session = finalize_session(session_id, db)
        return {
            "session_id": str(session_id),
            "status": session.status.value,
            "source_id": str(session.source_id) if session.source_id else None,
            "chunks_received": session.chunks_received or 0,
            "duration_seconds": session.duration_seconds,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/session/{session_id}/status", response_model=CaptureSessionStatusResponse)
async def session_status(
    session_id: UUID,
    db: Session = Depends(get_db),
):
    """Get the current status of a capture session."""
    session = get_session_status(session_id, db)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return CaptureSessionStatusResponse(
        session_id=session.id,
        status=SessionStatusEnum(session.status.value),
        capture_mode=MeetingCaptureModeEnum(session.capture_mode.value),
        chunks_received=session.chunks_received or 0,
        started_at=session.started_at,
        ended_at=session.ended_at,
        duration_seconds=session.duration_seconds,
        source_id=session.source_id,
    )
