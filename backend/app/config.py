"""WorkPilot AI — Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://workpilot:workpilot_dev@localhost:5432/workpilot"

    # MinIO / S3
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "workpilot"
    minio_secret_key: str = "workpilot_dev"
    minio_bucket: str = "workpilot-files"
    minio_secure: bool = False

    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection: str = "workpilot_chunks"

    # OpenAI
    openai_api_key: str = ""

    # Hugging Face
    hf_token: str = ""

    # Embedding
    embedding_model: str = "all-MiniLM-L6-v2"

    # Auth / JWT
    secret_key: str = "workpilot-dev-secret-change-in-production"

    # App
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
