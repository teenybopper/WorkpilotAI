"""Session state events — tracks and broadcasts session lifecycle changes."""

import logging
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional, Callable

logger = logging.getLogger(__name__)


class SessionEvent(str, Enum):
    """Session lifecycle events."""
    CREATED = "created"
    AUTHENTICATING = "authenticating"
    JOINING = "joining"
    JOINED = "joined"
    CAPTURING = "capturing"
    CHUNK_UPLOADED = "chunk_uploaded"
    LEAVING = "leaving"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class SessionStateChange:
    """A session state change event."""
    session_id: str
    event: SessionEvent
    timestamp: datetime
    details: Optional[dict] = None
    error: Optional[str] = None


class SessionStateTracker:
    """Tracks session state changes and notifies listeners."""

    def __init__(self):
        self._history: dict[str, list[SessionStateChange]] = {}
        self._listeners: list[Callable[[SessionStateChange], None]] = []

    def emit(self, session_id: str, event: SessionEvent, details: dict = None, error: str = None):
        """Emit a state change event."""
        change = SessionStateChange(
            session_id=session_id,
            event=event,
            timestamp=datetime.utcnow(),
            details=details,
            error=error,
        )

        if session_id not in self._history:
            self._history[session_id] = []
        self._history[session_id].append(change)

        logger.info(f"Session {session_id}: {event.value}" + (f" — {error}" if error else ""))

        for listener in self._listeners:
            try:
                listener(change)
            except Exception as e:
                logger.error(f"Listener error: {e}")

    def on_change(self, listener: Callable[[SessionStateChange], None]):
        """Register a state change listener."""
        self._listeners.append(listener)

    def get_history(self, session_id: str) -> list[SessionStateChange]:
        """Get the state history for a session."""
        return self._history.get(session_id, [])

    def current_state(self, session_id: str) -> Optional[SessionEvent]:
        """Get the current (latest) state for a session."""
        history = self._history.get(session_id, [])
        return history[-1].event if history else None
