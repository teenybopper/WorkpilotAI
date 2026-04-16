"""Audio stream ingestion from provider adapters.

Receives AudioFrame objects from provider adapters and
feeds them into the chunking pipeline.
"""

import logging
from typing import AsyncIterator
from wpai_org.adapters.base import AudioFrame, ProviderAdapter

logger = logging.getLogger(__name__)


class AudioIngestion:
    """Captures audio frames from a provider adapter and buffers them."""

    def __init__(self, adapter: ProviderAdapter):
        self.adapter = adapter
        self._running = False
        self._frames: list[AudioFrame] = []

    async def start(self, session_id: str) -> None:
        """Start ingesting audio frames from the adapter."""
        self._running = True
        logger.info(f"Audio ingestion started for {session_id}")

        async for frame in self.adapter.audio_stream(session_id):
            if not self._running:
                break
            self._frames.append(frame)

    def stop(self) -> None:
        """Stop audio ingestion."""
        self._running = False
        logger.info("Audio ingestion stopped")

    def drain_frames(self) -> list[AudioFrame]:
        """Drain all buffered frames."""
        frames = self._frames
        self._frames = []
        return frames

    @property
    def frame_count(self) -> int:
        return len(self._frames)
