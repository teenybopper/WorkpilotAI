"""Upload client — sends audio chunks to the WorkPilot backend."""

import httpx
import logging
from wpai_org.audio.chunker import AudioChunk
from wpai_org.config import settings

logger = logging.getLogger(__name__)


class BackendUploader:
    """Uploads audio chunks and manages session lifecycle with the WorkPilot backend."""

    def __init__(self):
        self.backend_url = settings.backend_url
        self.bot_token = settings.bot_service_token

    async def upload_chunk(self, session_id: str, chunk: AudioChunk) -> dict:
        """Upload a single audio chunk to the backend.

        Args:
            session_id: The capture session ID.
            chunk: WAV-encoded audio chunk.

        Returns:
            Backend response with chunk count.
        """
        url = f"{self.backend_url}/api/capture/session/{session_id}/chunk"

        async with httpx.AsyncClient() as client:
            files = {"file": (f"chunk_{chunk.index:06d}.wav", chunk.data, "audio/wav")}
            data = {"chunk_index": str(chunk.index)}

            response = await client.post(url, files=files, data=data, timeout=30.0)
            response.raise_for_status()

            result = response.json()
            logger.debug(f"Uploaded chunk {chunk.index} for session {session_id}")
            return result

    async def send_keepalive(self, session_id: str) -> None:
        """Send a keep-alive heartbeat to the backend."""
        url = f"{self.backend_url}/api/capture/session/{session_id}/keepalive"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={"bot_token": self.bot_token},
                timeout=10.0,
            )
            response.raise_for_status()

    async def finalize_session(self, session_id: str) -> dict:
        """Finalize a capture session on the backend.

        Triggers the transcription → extraction pipeline.
        """
        url = f"{self.backend_url}/api/capture/session/{session_id}/finalize"

        async with httpx.AsyncClient() as client:
            response = await client.post(url, timeout=30.0)
            response.raise_for_status()

            result = response.json()
            logger.info(f"Session {session_id} finalized on backend")
            return result
