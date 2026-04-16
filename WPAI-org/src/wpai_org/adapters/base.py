"""Abstract base class for meeting provider adapters.

Every provider adapter MUST implement this interface to handle
the full meeting bot lifecycle:
  authenticate → join_meeting → start_audio_capture → ... → stop_audio_capture → leave_meeting
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, AsyncIterator


@dataclass
class MeetingInfo:
    """Information needed to join a meeting."""
    meeting_url: str
    provider: str
    title: Optional[str] = None
    bot_display_name: str = "WorkPilot Bot"
    credentials: Optional[dict] = None


@dataclass
class AuthResult:
    """Result of provider authentication."""
    success: bool
    token: Optional[str] = None
    expires_at: Optional[str] = None
    error: Optional[str] = None


@dataclass
class JoinResult:
    """Result of joining a meeting."""
    success: bool
    provider_session_id: Optional[str] = None
    participant_id: Optional[str] = None
    error: Optional[str] = None


@dataclass
class AudioFrame:
    """A single audio frame from the meeting."""
    data: bytes
    sample_rate: int = 16000
    channels: int = 1
    timestamp_ms: int = 0


class ProviderAdapter(ABC):
    """Abstract meeting provider adapter.

    Implementations handle provider-specific authentication,
    meeting join/leave, and audio stream capture.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider name."""
        ...

    @abstractmethod
    async def authenticate(self, credentials: dict) -> AuthResult:
        """Authenticate with the provider using the given credentials.

        Args:
            credentials: Provider-specific auth credentials (OAuth tokens, API keys, etc.)

        Returns:
            AuthResult indicating success/failure.
        """
        ...

    @abstractmethod
    async def join_meeting(self, meeting_info: MeetingInfo) -> JoinResult:
        """Join a meeting as a visible bot participant.

        Args:
            meeting_info: Meeting URL, title, and display name.

        Returns:
            JoinResult with provider session ID.
        """
        ...

    @abstractmethod
    async def start_audio_capture(self, session_id: str) -> None:
        """Start capturing audio from the meeting.

        Audio frames should be yielded via `audio_stream()`.

        Args:
            session_id: Internal session identifier.
        """
        ...

    @abstractmethod
    async def stop_audio_capture(self, session_id: str) -> None:
        """Stop capturing audio.

        Args:
            session_id: Internal session identifier.
        """
        ...

    @abstractmethod
    async def leave_meeting(self, session_id: str) -> None:
        """Leave the meeting gracefully.

        Args:
            session_id: Internal session identifier.
        """
        ...

    @abstractmethod
    async def get_status(self, session_id: str) -> str:
        """Get the current status of the bot in the meeting.

        Returns:
            One of: 'disconnected', 'joining', 'connected', 'capturing', 'leaving'
        """
        ...

    async def audio_stream(self, session_id: str) -> AsyncIterator[AudioFrame]:
        """Yield audio frames from the meeting.

        Default implementation yields nothing — override in subclass.
        """
        return
        yield  # Make this a generator
