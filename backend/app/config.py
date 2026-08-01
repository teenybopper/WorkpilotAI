"""WorkPilot AI — Application configuration for local desktop app."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings


def _default_data_dir() -> str:
    """Default data directory: ~/WorkPilotAI/"""
    return str(Path.home() / "WorkPilotAI")


class Settings(BaseSettings):
    # Data directories
    data_dir: str = _default_data_dir()

    @property
    def db_path(self) -> str:
        return os.path.join(self.data_dir, "data", "workpilot.db")

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.db_path}"

    @property
    def files_dir(self) -> str:
        return os.path.join(self.data_dir, "files")

    @property
    def chroma_dir(self) -> str:
        return os.path.join(self.data_dir, "data", "chroma")

    @property
    def config_file(self) -> str:
        return os.path.join(self.data_dir, "config.json")

    # OpenAI
    openai_api_key: str = ""

    # Hugging Face (for pyannote diarization)
    hf_token: str = ""

    # Embedding
    embedding_model: str = "all-MiniLM-L6-v2"

    # ChromaDB collection
    chroma_collection: str = "workpilot_chunks"

    # App
    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    def ensure_directories(self):
        """Create all required data directories on first run."""
        os.makedirs(os.path.join(self.data_dir, "data"), exist_ok=True)
        os.makedirs(self.files_dir, exist_ok=True)
        os.makedirs(self.chroma_dir, exist_ok=True)


settings = Settings()
