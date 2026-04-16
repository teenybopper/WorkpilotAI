"""Capture service — manages audio chunk ingestion from local companion and org bot."""

import logging
import uuid
import hashlib
from datetime import datetime
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.models import (
    MeetingSession, Source, DeviceToken, BotServiceToken,
    MeetingCaptureMode, SessionStatus, SourceType, SourceStatus,
)
from app.utils.storage import upload_file, ensure_bucket

logger = logging.getLogger(__name__)


def verify_device_token(db: DBSession, raw_token: str) -> DeviceToken | None:
    """Verify a device token and return the DeviceToken record."""
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    device = db.query(DeviceToken).filter(
        DeviceToken.token_hash == token_hash,
        DeviceToken.is_active == True,
    ).first()
    if device:
        device.last_seen_at = datetime.utcnow()
        db.commit()
    return device


def verify_bot_token(db: DBSession, raw_token: str) -> BotServiceToken | None:
    """Verify a bot service token and return the BotServiceToken record."""
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    token = db.query(BotServiceToken).filter(
        BotServiceToken.token_hash == token_hash,
        BotServiceToken.is_active == True,
    ).first()
    if token:
        token.last_used_at = datetime.utcnow()
        db.commit()
    return token


def create_capture_session(
    workspace_id: uuid.UUID,
    capture_mode: MeetingCaptureMode,
    db: DBSession,
    title: str | None = None,
    platform: str | None = None,
    meeting_url: str | None = None,
    consent_given: bool = False,
    device_id: uuid.UUID | None = None,
    bot_service_token_id: uuid.UUID | None = None,
    provider_session_id: str | None = None,
) -> MeetingSession:
    """Create a capture session bound to a device or bot service token."""
    session = MeetingSession(
        workspace_id=workspace_id,
        capture_mode=capture_mode,
        status=SessionStatus.LISTENING,
        platform=platform or ("system_audio" if capture_mode == MeetingCaptureMode.LOCAL_LISTENER else "bot"),
        meeting_url=meeting_url,
        title=title or f"Capture {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        consent_given=consent_given,
        started_at=datetime.utcnow(),
        device_id=device_id,
        bot_service_token_id=bot_service_token_id,
        provider_session_id=provider_session_id,
        chunks_received=0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    logger.info(
        f"Created capture session {session.id} "
        f"[mode={capture_mode.value}, device={device_id}, bot={bot_service_token_id}]"
    )
    return session


def receive_audio_chunk(
    session_id: uuid.UUID,
    chunk_data: bytes,
    chunk_index: int,
    db: DBSession,
) -> int:
    """Store an audio chunk in MinIO and update the session counter."""
    session = db.query(MeetingSession).filter(MeetingSession.id == session_id).first()
    if not session:
        raise ValueError("Session not found")
    if session.status not in (SessionStatus.LISTENING, SessionStatus.PENDING):
        raise ValueError(f"Session is {session.status.value}, cannot accept chunks")

    # Ensure MinIO bucket
    ensure_bucket()

    # Upload chunk to MinIO
    object_name = f"capture/{session_id}/chunk_{chunk_index:06d}.wav"
    upload_file(object_name, chunk_data, "audio/wav")

    # Update counter
    session.chunks_received = (session.chunks_received or 0) + 1
    db.commit()

    logger.debug(f"Received chunk {chunk_index} for session {session_id}")
    return session.chunks_received


def process_keepalive(session_id: uuid.UUID, db: DBSession) -> MeetingSession:
    """Process a keep-alive heartbeat for a capture session."""
    session = db.query(MeetingSession).filter(MeetingSession.id == session_id).first()
    if not session:
        raise ValueError("Session not found")

    session.metadata_json = {
        **(session.metadata_json or {}),
        "last_keepalive": datetime.utcnow().isoformat(),
    }
    db.commit()
    return session


def finalize_session(session_id: uuid.UUID, db: DBSession) -> MeetingSession:
    """Finalize a capture session — concatenate chunks, create Source, trigger transcription."""
    session = db.query(MeetingSession).filter(MeetingSession.id == session_id).first()
    if not session:
        raise ValueError("Session not found")

    session.status = SessionStatus.PROCESSING
    session.ended_at = datetime.utcnow()
    if session.started_at:
        session.duration_seconds = (session.ended_at - session.started_at).total_seconds()

    # Create a Source record for the captured audio
    source = Source(
        workspace_id=session.workspace_id,
        source_type=SourceType.MEETING,
        filename=f"capture_{session.id}.wav",
        storage_path=f"capture/{session.id}/",
        mime_type="audio/wav",
        status=SourceStatus.UPLOADED,
        metadata_json={
            "session_id": str(session.id),
            "capture_mode": session.capture_mode.value,
            "chunks_count": session.chunks_received or 0,
            "duration_seconds": session.duration_seconds,
        },
    )
    db.add(source)
    db.flush()

    session.source_id = source.id
    db.commit()
    db.refresh(session)

    logger.info(
        f"Finalized capture session {session.id}: "
        f"{session.chunks_received} chunks, {session.duration_seconds:.1f}s"
    )

    # NOTE: In production, this would trigger an async task to:
    # 1. Concatenate audio chunks from MinIO
    # 2. Run transcription (faster-whisper)
    # 3. Run diarization (pyannote)
    # 4. Extract actions (LLM)
    # 5. Index in Qdrant
    # For now, mark as completed and let the user trigger processing via MeetOps UI
    session.status = SessionStatus.COMPLETED
    source.status = SourceStatus.READY
    db.commit()

    return session


def get_session_status(session_id: uuid.UUID, db: DBSession) -> MeetingSession | None:
    """Get the current status of a capture session."""
    return db.query(MeetingSession).filter(MeetingSession.id == session_id).first()
