"""MeetOps Sessions router — start, stop, and manage meeting capture sessions."""

import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MeetingCaptureMode, SessionStatus
from app.schemas import (
    MeetingSessionCreate, MeetingSessionResponse,
    MeetingSessionTranscriptSubmit,
)
from app.services.auth import get_or_create_local_user
from app.services.meetops_sessions import (
    start_session, stop_session, submit_transcript,
    get_session, list_sessions,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/meetings/sessions", tags=["MeetOps Sessions"])


@router.post("/start", response_model=MeetingSessionResponse)
async def start_meeting_session(
    request: MeetingSessionCreate,
    db: Session = Depends(get_db),
):
    """Start a new MeetOps capture session (business bot-join or personal listener)."""
    user = get_or_create_local_user(db)

    try:
        session = start_session(
            workspace_id=request.workspace_id,
            capture_mode=MeetingCaptureMode(request.capture_mode.value),
            user=user,
            db=db,
            title=request.title,
            platform=request.platform,
            meeting_url=request.meeting_url,
            consent_given=request.consent_given,
        )
        return session
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{session_id}/stop", response_model=MeetingSessionResponse)
async def stop_meeting_session(
    session_id: UUID,
    db: Session = Depends(get_db),
):
    """Stop an active MeetOps session."""
    try:
        session = stop_session(session_id, db)
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{session_id}/transcript", response_model=MeetingSessionResponse)
async def submit_session_transcript(
    session_id: UUID,
    request: MeetingSessionTranscriptSubmit,
    db: Session = Depends(get_db),
):
    """Submit transcript data for a local listener session."""
    try:
        session = submit_transcript(
            session_id=session_id,
            transcript_text=request.transcript_text,
            segments=request.segments,
            db=db,
        )
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[MeetingSessionResponse])
async def list_meeting_sessions(
    workspace_id: UUID,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """List meeting sessions for a workspace."""
    session_status = SessionStatus(status) if status else None
    sessions = list_sessions(workspace_id, db, session_status)
    return sessions


@router.get("/{session_id}", response_model=MeetingSessionResponse)
async def get_meeting_session(
    session_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a specific meeting session."""
    session = get_session(session_id, db)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
