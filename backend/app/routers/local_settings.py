"""WorkPilot AI — Local settings router (API keys, model preferences)."""

import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.config import settings
from app.utils.storage import get_storage_usage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings", tags=["Settings"])


class SettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    hf_token: Optional[str] = None
    whisper_model: Optional[str] = None
    embedding_model: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None


def _load_config() -> dict:
    """Load config from the local JSON file."""
    config_path = Path(settings.config_file)
    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def _save_config(config: dict):
    """Save config to the local JSON file."""
    config_path = Path(settings.config_file)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)


def _mask_key(key: str) -> str:
    """Mask an API key for display (show first 4 and last 4 chars)."""
    if not key or len(key) < 12:
        return "***" if key else ""
    return f"{key[:4]}...{key[-4:]}"


@router.get("")
async def get_settings():
    """Get current settings (API keys masked)."""
    config = _load_config()
    storage = get_storage_usage()

    return {
        "api_keys": {
            "openai_api_key": _mask_key(config.get("openai_api_key", "")),
            "openai_configured": bool(config.get("openai_api_key")),
            "hf_token": _mask_key(config.get("hf_token", "")),
            "hf_configured": bool(config.get("hf_token")),
        },
        "models": {
            "whisper_model": config.get("whisper_model", "base"),
            "embedding_model": config.get("embedding_model", "all-MiniLM-L6-v2"),
        },
        "user": {
            "name": config.get("user_name", "Local User"),
            "email": config.get("user_email", ""),
        },
        "storage": storage,
        "data_dir": settings.data_dir,
    }


@router.put("")
async def update_settings(body: SettingsUpdate):
    """Update settings (API keys, model preferences)."""
    config = _load_config()

    if body.openai_api_key is not None:
        config["openai_api_key"] = body.openai_api_key
        # Also update the runtime settings
        settings.openai_api_key = body.openai_api_key
        logger.info("OpenAI API key updated")

    if body.hf_token is not None:
        config["hf_token"] = body.hf_token
        settings.hf_token = body.hf_token
        logger.info("HuggingFace token updated")

    if body.whisper_model is not None:
        config["whisper_model"] = body.whisper_model
        logger.info(f"Whisper model set to: {body.whisper_model}")

    if body.embedding_model is not None:
        config["embedding_model"] = body.embedding_model
        settings.embedding_model = body.embedding_model
        logger.info(f"Embedding model set to: {body.embedding_model}")

    if body.user_name is not None:
        config["user_name"] = body.user_name

    if body.user_email is not None:
        config["user_email"] = body.user_email

    _save_config(config)
    return {"message": "Settings updated", "updated_fields": [k for k, v in body.dict().items() if v is not None]}


@router.get("/status")
async def settings_status():
    """Check which API keys are configured and valid."""
    config = _load_config()

    checks = {
        "openai": {
            "configured": bool(config.get("openai_api_key")),
            "valid": None,  # Could add validation ping
        },
        "huggingface": {
            "configured": bool(config.get("hf_token")),
            "valid": None,
        },
    }

    # Check if OpenAI key works
    if config.get("openai_api_key"):
        try:
            import openai
            client = openai.OpenAI(api_key=config["openai_api_key"])
            client.models.list()
            checks["openai"]["valid"] = True
        except Exception:
            checks["openai"]["valid"] = False

    all_configured = all(c["configured"] for c in checks.values())

    return {
        "ready": all_configured,
        "checks": checks,
    }


def load_api_keys_to_settings():
    """Load API keys from config file into runtime settings on startup."""
    config = _load_config()
    if config.get("openai_api_key"):
        settings.openai_api_key = config["openai_api_key"]
    if config.get("hf_token"):
        settings.hf_token = config["hf_token"]
    if config.get("embedding_model"):
        settings.embedding_model = config["embedding_model"]
    logger.info("Loaded API keys from config file")
