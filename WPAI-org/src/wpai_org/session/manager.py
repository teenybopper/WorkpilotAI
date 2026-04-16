"""Session lifecycle manager.

Orchestrates the full bot session flow:
1. Receive session request from main backend
2. Authenticate with provider adapter
3. Join meeting as visible bot
4. Start audio capture
5. Chunk and upload audio to main backend
6. Send state updates
7. Stop on command or meeting end
8. Finalize via backend API
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Optional

from wpai_org.adapters import get_adapter
from wpai_org.adapters.base import MeetingInfo
from wpai_org.audio.uploader import BackendUploader
from wpai_org.config import settings

logger = logging.getLogger(__name__)


@dataclass
class BotSession:
    """Tracks a single bot session."""
    session_id: str
    workspace_id: str
    provider: str
    meeting_url: str
    title: Optional[str] = None
    status: str = "joining"  # joining, listening, leaving, completed, error
    chunks_sent: int = 0
    duration_seconds: float = 0.0
    error: Optional[str] = None
    started_at: float = field(default_factory=time.time)


class SessionManager:
    """Manages active bot sessions across providers."""

    def __init__(self):
        self._sessions: dict[str, BotSession] = {}
        self._uploader = BackendUploader()

    async def start_session(
        self,
        session_id: str,
        workspace_id: str,
        provider: str,
        meeting_url: str,
        title: Optional[str] = None,
        bot_token: Optional[str] = None,
        credentials: Optional[dict] = None,
    ) -> BotSession:
        """Start a new bot session."""
        if session_id in self._sessions:
            raise ValueError(f"Session {session_id} already exists")

        session = BotSession(
            session_id=session_id,
            workspace_id=workspace_id,
            provider=provider,
            meeting_url=meeting_url,
            title=title,
        )
        self._sessions[session_id] = session

        adapter = get_adapter(provider)
        if not adapter:
            session.status = "error"
            session.error = f"No adapter for provider: {provider}"
            return session

        try:
            # 1. Authenticate with provider
            if credentials:
                auth_result = await adapter.authenticate(credentials)
                if not auth_result.success:
                    raise ValueError(f"Auth failed: {auth_result.error}")

            # 2. Join meeting
            meeting_info = MeetingInfo(
                meeting_url=meeting_url,
                provider=provider,
                title=title,
                bot_display_name=settings.bot_display_name,
                credentials=credentials,
            )
            join_result = await adapter.join_meeting(meeting_info)
            if not join_result.success:
                raise ValueError(f"Join failed: {join_result.error}")

            # 3. Start audio capture
            await adapter.start_audio_capture(session_id)
            session.status = "listening"

            logger.info(f"Bot session {session_id} started on {provider}")

            # 4. In production, spawn background tasks:
            # - Audio capture loop (reads frames from adapter.audio_stream)
            # - Chunk encoding (PCM → WAV chunks)
            # - Upload loop (sends chunks to backend)
            # - Keep-alive ticker

        except Exception as e:
            session.status = "error"
            session.error = str(e)
            logger.error(f"Failed to start session {session_id}: {e}")

        return session

    async def stop_session(self, session_id: str) -> BotSession:
        """Stop a bot session."""
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        session.status = "leaving"

        adapter = get_adapter(session.provider)
        if adapter:
            try:
                await adapter.stop_audio_capture(session_id)
                await adapter.leave_meeting(session_id)
            except Exception as e:
                logger.error(f"Error leaving meeting: {e}")

        session.duration_seconds = time.time() - session.started_at
        session.status = "completed"

        # Finalize on the backend
        try:
            await self._uploader.finalize_session(session_id)
        except Exception as e:
            logger.error(f"Failed to finalize session on backend: {e}")

        logger.info(f"Bot session {session_id} completed ({session.duration_seconds:.1f}s)")
        return session

    def get_session(self, session_id: str) -> Optional[BotSession]:
        """Get a session by ID."""
        return self._sessions.get(session_id)

    def list_sessions(self) -> list[BotSession]:
        """List all active sessions."""
        return list(self._sessions.values())
