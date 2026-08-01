"""Capture service — session lifecycle and audio chunk management (local)."""

import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import (
    MeetingSession, Source, MeetingCaptureMode,
    SessionStatus, SourceType, SourceStatus, Workspace,
)
from app.utils.storage import save_chunk
from app.services.auth import get_or_create_local_user

logger = logging.getLogger(__name__)


def create_capture_session(
    workspace_id: str,
    capture_mode: MeetingCaptureMode,
    db: Session,
    title: str = None,
    platform: str = None,
    consent_given: bool = True,
) -> MeetingSession:
    """Create a new capture session."""
    db_workspace = None
    if workspace_id:
        try:
            db_workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        except Exception:
            pass

    if not db_workspace:
        # Fallback to the first available workspace
        db_workspace = db.query(Workspace).order_by(Workspace.created_at.asc()).first()
        if not db_workspace:
            user = get_or_create_local_user(db)
            db_workspace = Workspace(
                name="My Workspace",
                description="Default workspace created automatically.",
                owner_id=user.id,
            )
            db.add(db_workspace)
            db.commit()
            db.refresh(db_workspace)
        workspace_id = str(db_workspace.id)

    session = MeetingSession(
        workspace_id=workspace_id,
        capture_mode=capture_mode,
        status=SessionStatus.LISTENING,
        platform=platform,
        title=title or f"Recording {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        consent_given=consent_given,
        started_at=datetime.utcnow(),
        chunks_received=0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    logger.info(f"Capture session created: {session.id} ({capture_mode.value})")
    return session


def receive_audio_chunk(
    session_id: str,
    content: bytes,
    chunk_index: int,
    db: Session,
) -> int:
    """Store an audio chunk to local filesystem."""
    session = db.query(MeetingSession).filter(
        MeetingSession.id == session_id
    ).first()

    if not session:
        raise ValueError(f"Session not found: {session_id}")
    if session.status not in (SessionStatus.LISTENING, SessionStatus.PENDING):
        raise ValueError(f"Session not accepting chunks (status: {session.status.value})")

    # Save chunk to local filesystem
    save_chunk(session.workspace_id, session_id, chunk_index, content)

    session.chunks_received = (session.chunks_received or 0) + 1
    if session.status == SessionStatus.PENDING:
        session.status = SessionStatus.LISTENING
        session.started_at = datetime.utcnow()

    db.commit()
    return session.chunks_received


def process_keepalive(session_id: str, db: Session) -> MeetingSession:
    """Process a keep-alive heartbeat."""
    session = db.query(MeetingSession).filter(
        MeetingSession.id == session_id
    ).first()
    if not session:
        raise ValueError(f"Session not found: {session_id}")

    session.metadata_json = {
        **(session.metadata_json or {}),
        "last_keepalive": datetime.utcnow().isoformat(),
    }
    db.commit()
    return session


def finalize_session(session_id: str, db: Session) -> MeetingSession:
    """Finalize a capture session — create source record, trigger pipeline."""
    session = db.query(MeetingSession).filter(
        MeetingSession.id == session_id
    ).first()
    if not session:
        raise ValueError(f"Session not found: {session_id}")

    session.status = SessionStatus.PROCESSING
    session.ended_at = datetime.utcnow()

    if session.started_at:
        session.duration_seconds = (session.ended_at - session.started_at).total_seconds()

    # Create a source record for the captured audio
    source = Source(
        workspace_id=session.workspace_id,
        source_type=SourceType.MEETING,
        filename=session.title or f"recording_{session_id}",
        storage_path=f"{session.workspace_id}/{session_id}",
        status=SourceStatus.UPLOADED,
    )
    db.add(source)
    db.flush()

    session.source_id = source.id
    db.commit()
    db.refresh(session)

    logger.info(
        f"Session finalized: {session_id}, "
        f"chunks={session.chunks_received}, "
        f"duration={session.duration_seconds:.1f}s"
    )

    # TODO: Trigger async processing pipeline (transcription → diarization → extraction)
    return session


def get_session_status(session_id: str, db: Session) -> MeetingSession:
    """Get the current status of a capture session."""
    return db.query(MeetingSession).filter(
        MeetingSession.id == session_id
    ).first()
