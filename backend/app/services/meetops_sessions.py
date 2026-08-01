"""MeetOps Sessions service — manage live meeting capture sessions (local)."""

import logging
import uuid
from datetime import datetime
from sqlalchemy.orm import Session as DBSession

from app.models import (
    MeetingSession, Source, MeetingCaptureMode, SessionStatus,
    SourceType, SourceStatus, User,
)

logger = logging.getLogger(__name__)


def start_session(
    workspace_id: uuid.UUID,
    capture_mode: MeetingCaptureMode,
    user: User,
    db: DBSession,
    title: str | None = None,
    platform: str | None = None,
    meeting_url: str | None = None,
    consent_given: bool = False,
    config: dict | None = None,
) -> MeetingSession:
    """Start a new MeetOps capture session (no entitlement checks in local mode)."""

    if capture_mode == MeetingCaptureMode.LOCAL_LISTENER:
        if not consent_given:
            raise ValueError("Consent must be given before capturing audio")

    session = MeetingSession(
        workspace_id=workspace_id,
        capture_mode=capture_mode,
        status=SessionStatus.PENDING,
        platform=platform or _infer_platform(capture_mode),
        title=title or f"Meeting {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        config_json=config,
        consent_given=consent_given,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    if capture_mode == MeetingCaptureMode.LOCAL_LISTENER:
        _start_local_listener(session, db)

    logger.info(
        f"Started MeetOps session {session.id} "
        f"[mode={capture_mode.value}, workspace={workspace_id}]"
    )
    return session


def stop_session(session_id: uuid.UUID, db: DBSession) -> MeetingSession:
    """Stop an active MeetOps session."""
    session = db.query(MeetingSession).filter(MeetingSession.id == session_id).first()
    if not session:
        raise ValueError("Session not found")

    if session.status in (SessionStatus.COMPLETED, SessionStatus.CANCELLED, SessionStatus.FAILED):
        raise ValueError(f"Session is already {session.status.value}")

    session.status = SessionStatus.PROCESSING
    session.ended_at = datetime.utcnow()
    if session.started_at:
        session.duration_seconds = (session.ended_at - session.started_at).total_seconds()

    db.commit()
    db.refresh(session)

    logger.info(f"Stopped MeetOps session {session.id}")
    return session


def submit_transcript(
    session_id: uuid.UUID,
    transcript_text: str,
    segments: list[dict] | None,
    db: DBSession,
) -> MeetingSession:
    """Submit transcript data for a local listener session."""
    from app.models import TranscriptSegment

    session = db.query(MeetingSession).filter(MeetingSession.id == session_id).first()
    if not session:
        raise ValueError("Session not found")

    if session.capture_mode != MeetingCaptureMode.LOCAL_LISTENER:
        raise ValueError("Transcript submission is only for local listener sessions")

    # Create a Source record for the transcript
    source = Source(
        workspace_id=session.workspace_id,
        source_type=SourceType.MEETING,
        filename=f"session_{session.id}_transcript.txt",
        storage_path=f"sessions/{session.id}/transcript.txt",
        mime_type="text/plain",
        file_size=len(transcript_text.encode()),
        status=SourceStatus.READY,
        metadata_json={"session_id": str(session.id), "capture_mode": "local_listener"},
    )
    db.add(source)
    db.flush()

    # Store transcript segments
    if segments:
        for seg in segments:
            ts = TranscriptSegment(
                source_id=source.id,
                speaker_label=seg.get("speaker"),
                start_time=seg.get("start_time"),
                end_time=seg.get("end_time"),
                text=seg.get("text", ""),
                confidence=seg.get("confidence"),
            )
            db.add(ts)
    else:
        # Store as single segment
        ts = TranscriptSegment(
            source_id=source.id,
            text=transcript_text,
        )
        db.add(ts)

    # Link source to session
    session.source_id = source.id
    session.status = SessionStatus.COMPLETED
    if not session.ended_at:
        session.ended_at = datetime.utcnow()
    if session.started_at:
        session.duration_seconds = (session.ended_at - session.started_at).total_seconds()

    db.commit()
    db.refresh(session)

    logger.info(f"Transcript submitted for session {session.id}, source={source.id}")
    return session


def get_session(session_id: uuid.UUID, db: DBSession) -> MeetingSession | None:
    """Get a session by ID."""
    return db.query(MeetingSession).filter(MeetingSession.id == session_id).first()


def list_sessions(
    workspace_id: uuid.UUID,
    db: DBSession,
    status: SessionStatus | None = None,
) -> list[MeetingSession]:
    """List sessions for a workspace."""
    query = db.query(MeetingSession).filter(
        MeetingSession.workspace_id == workspace_id
    )
    if status:
        query = query.filter(MeetingSession.status == status)
    return query.order_by(MeetingSession.created_at.desc()).all()


# ── Internal helpers ──────────────────────────────────────────────────────

def _infer_platform(mode: MeetingCaptureMode) -> str:
    """Infer the meeting platform from mode."""
    if mode == MeetingCaptureMode.LOCAL_LISTENER:
        return "system_audio"
    if mode == MeetingCaptureMode.UPLOAD:
        return "file_upload"
    return "unknown"


def _start_local_listener(session: MeetingSession, db: DBSession):
    """Mark local listener session as active (actual capture happens client-side)."""
    session.status = SessionStatus.LISTENING
    session.started_at = datetime.utcnow()
    db.commit()
    logger.info(f"Local listener started for session {session.id}")
