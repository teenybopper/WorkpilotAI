"""Embedding generation utility using sentence-transformers."""

from sentence_transformers import SentenceTransformer
from app.config import settings
import logging
import numpy as np

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    """Load the sentence-transformer model (lazy singleton)."""
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {settings.embedding_model}")
        _model = SentenceTransformer(settings.embedding_model)
        logger.info("Embedding model loaded successfully")
    return _model


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts."""
    model = get_embedding_model()
    embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    return embeddings.tolist()


def generate_embedding(text: str) -> list[float]:
    """Generate embedding for a single text."""
    return generate_embeddings([text])[0]


def chunk_text(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    """Split text into overlapping chunks by character count, respecting sentence boundaries."""
    if not text or not text.strip():
        return []

    sentences = text.replace("\n", " ").split(". ")
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        if len(current_chunk) + len(sentence) + 2 > chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            # Keep overlap from end of previous chunk
            words = current_chunk.split()
            overlap_words = words[-overlap // 5:] if len(words) > overlap // 5 else []
            current_chunk = " ".join(overlap_words) + " " + sentence
        else:
            current_chunk += ". " + sentence if current_chunk else sentence

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks if chunks else [text[:chunk_size]]
