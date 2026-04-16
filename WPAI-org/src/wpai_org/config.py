"""Configuration for the WPAI-org bot service."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Bot service configuration — loaded from environment variables."""

    # WorkPilot Backend
    backend_url: str = "http://localhost:8000"
    bot_service_token: str = ""  # Set via WPAI_ORG_BOT_SERVICE_TOKEN

    # Service
    host: str = "0.0.0.0"
    port: int = 8001
    log_level: str = "info"

    # Audio Capture
    chunk_duration_secs: float = 5.0
    keepalive_interval_secs: float = 15.0

    # Provider defaults
    bot_display_name: str = "WorkPilot Bot"

    model_config = {
        "env_prefix": "WPAI_ORG_",
        "env_file": ".env",
    }


settings = Settings()
