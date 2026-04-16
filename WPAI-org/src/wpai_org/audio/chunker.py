"""Audio chunking — converts raw audio frames into WAV chunks for upload."""

import io
import wave
import logging
from dataclasses import dataclass
from wpai_org.adapters.base import AudioFrame
from wpai_org.config import settings

logger = logging.getLogger(__name__)


@dataclass
class AudioChunk:
    """A WAV-encoded audio chunk ready for upload."""
    index: int
    data: bytes
    duration_secs: float
    sample_count: int


class AudioChunker:
    """Buffers audio frames and produces WAV chunks at fixed intervals."""

    def __init__(self, sample_rate: int = 16000, channels: int = 1):
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk_duration = settings.chunk_duration_secs
        self._buffer = bytearray()
        self._chunk_index = 0
        self._bytes_per_chunk = int(
            self.chunk_duration * sample_rate * channels * 2  # 16-bit samples
        )

    def push_frames(self, frames: list[AudioFrame]) -> None:
        """Add audio frames to the buffer."""
        for frame in frames:
            self._buffer.extend(frame.data)

    def has_chunk(self) -> bool:
        """Check if a complete chunk is available."""
        return len(self._buffer) >= self._bytes_per_chunk

    def drain_chunk(self) -> AudioChunk | None:
        """Drain one chunk from the buffer, encoding as WAV."""
        if len(self._buffer) < self._bytes_per_chunk:
            return None

        chunk_data = bytes(self._buffer[:self._bytes_per_chunk])
        del self._buffer[:self._bytes_per_chunk]

        wav_data = self._encode_wav(chunk_data)
        chunk = AudioChunk(
            index=self._chunk_index,
            data=wav_data,
            duration_secs=self.chunk_duration,
            sample_count=len(chunk_data) // (self.channels * 2),
        )

        self._chunk_index += 1
        logger.debug(f"Produced chunk {chunk.index}")
        return chunk

    def flush(self) -> AudioChunk | None:
        """Flush remaining buffer as a partial chunk."""
        if not self._buffer:
            return None

        chunk_data = bytes(self._buffer)
        self._buffer.clear()

        duration = len(chunk_data) / (self.sample_rate * self.channels * 2)
        wav_data = self._encode_wav(chunk_data)

        chunk = AudioChunk(
            index=self._chunk_index,
            data=wav_data,
            duration_secs=duration,
            sample_count=len(chunk_data) // (self.channels * 2),
        )
        self._chunk_index += 1
        return chunk

    def _encode_wav(self, pcm_data: bytes) -> bytes:
        """Encode raw PCM data as a WAV file."""
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(self.channels)
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(self.sample_rate)
            wf.writeframes(pcm_data)
        return buf.getvalue()
