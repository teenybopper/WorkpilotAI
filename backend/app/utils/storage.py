"""WorkPilot AI — Local filesystem storage (replaces MinIO)."""

import os
import shutil
import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


def ensure_storage():
    """Ensure the files directory exists."""
    os.makedirs(settings.files_dir, exist_ok=True)
    logger.info(f"Storage directory ready: {settings.files_dir}")


def _workspace_dir(workspace_id: str) -> str:
    """Get the workspace directory path."""
    path = os.path.join(settings.files_dir, str(workspace_id))
    os.makedirs(path, exist_ok=True)
    return path


def _source_dir(workspace_id: str, source_id: str) -> str:
    """Get the source directory path within a workspace."""
    path = os.path.join(_workspace_dir(workspace_id), str(source_id))
    os.makedirs(path, exist_ok=True)
    return path


def save_file(workspace_id: str, source_id: str, filename: str, content: bytes) -> str:
    """Save a file to local storage. Returns the relative storage path."""
    directory = _source_dir(workspace_id, source_id)
    filepath = os.path.join(directory, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    # Return relative path from files_dir for storage_path column
    rel_path = os.path.relpath(filepath, settings.files_dir)
    logger.debug(f"Saved file: {rel_path} ({len(content)} bytes)")
    return rel_path


def save_chunk(workspace_id: str, session_id: str, chunk_index: int, content: bytes) -> str:
    """Save an audio chunk. Returns relative storage path."""
    directory = _source_dir(workspace_id, str(session_id))
    filename = f"chunk_{chunk_index:06d}.wav"
    filepath = os.path.join(directory, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    rel_path = os.path.relpath(filepath, settings.files_dir)
    logger.debug(f"Saved chunk: {rel_path} ({len(content)} bytes)")
    return rel_path


def get_file_path(storage_path: str) -> str:
    """Get the absolute filesystem path for a stored file."""
    return os.path.join(settings.files_dir, storage_path)


def get_temp_path(storage_path: str) -> str:
    """Get the file path (same as get_file_path for local storage).

    This exists for compatibility with code that previously downloaded
    from MinIO to a temp path.
    """
    return get_file_path(storage_path)


def delete_file(storage_path: str):
    """Delete a stored file."""
    filepath = get_file_path(storage_path)
    if os.path.exists(filepath):
        os.remove(filepath)
        logger.debug(f"Deleted file: {storage_path}")


def delete_source_files(workspace_id: str, source_id: str):
    """Delete all files for a source."""
    directory = _source_dir(workspace_id, source_id)
    if os.path.exists(directory):
        shutil.rmtree(directory)
        logger.debug(f"Deleted source files: {workspace_id}/{source_id}")


def get_storage_usage() -> dict:
    """Get storage usage info."""
    total_size = 0
    file_count = 0
    for dirpath, dirnames, filenames in os.walk(settings.files_dir):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            total_size += os.path.getsize(fp)
            file_count += 1

    return {
        "files_dir": settings.files_dir,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "file_count": file_count,
    }


def list_chunks(workspace_id: str, session_id: str) -> list[str]:
    """List all chunk files for a capture session, sorted by index."""
    directory = _source_dir(workspace_id, str(session_id))
    if not os.path.exists(directory):
        return []
    chunks = sorted(
        f for f in os.listdir(directory)
        if f.startswith("chunk_") and f.endswith(".wav")
    )
    return [os.path.join(directory, c) for c in chunks]


def merge_chunks(workspace_id: str, session_id: str, output_filename: str) -> str:
    """Merge all audio chunks into a single WAV file. Returns storage path."""
    chunk_paths = list_chunks(workspace_id, session_id)
    if not chunk_paths:
        raise ValueError("No chunks found to merge")

    output_dir = _source_dir(workspace_id, str(session_id))
    output_path = os.path.join(output_dir, output_filename)

    import wave
    try:
        with wave.open(chunk_paths[0], 'rb') as w_in:
            params = w_in.getparams()
        
        with wave.open(output_path, 'wb') as w_out:
            w_out.setparams(params)
            for path in chunk_paths:
                with wave.open(path, 'rb') as w_in:
                    w_out.writeframes(w_in.readframes(w_in.getnframes()))
    except Exception as e:
        logger.warning(f"wave module failed to merge chunks: {e}. Falling back to raw concatenation.")
        with open(output_path, "wb") as out:
            for chunk_path in chunk_paths:
                with open(chunk_path, "rb") as chunk:
                    out.write(chunk.read())

    rel_path = os.path.relpath(output_path, settings.files_dir)
    logger.info(f"Merged {len(chunk_paths)} chunks → {rel_path}")
    return rel_path
