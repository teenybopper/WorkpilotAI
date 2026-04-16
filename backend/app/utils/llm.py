"""OpenAI LLM client abstraction for WorkPilot AI."""

from openai import OpenAI
from app.config import settings
import logging
import json

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def get_llm_client() -> OpenAI:
    """Get or create the OpenAI client singleton."""
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def llm_complete(
    prompt: str,
    system_prompt: str = "You are a helpful AI assistant for enterprise work management.",
    model: str = "gpt-4o-mini",
    temperature: float = 0.3,
    max_tokens: int = 2048,
) -> str:
    """Send a completion request to the LLM and return the response text."""
    client = get_llm_client()

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )

    return response.choices[0].message.content.strip()


def llm_json(
    prompt: str,
    system_prompt: str = "You are a structured data extraction AI. Always respond with valid JSON.",
    model: str = "gpt-4o-mini",
    temperature: float = 0.1,
    max_tokens: int = 4096,
) -> dict | list:
    """Send a completion request and parse the response as JSON."""
    client = get_llm_client()

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )

    text = response.choices[0].message.content.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse LLM JSON response: {text[:500]}")
        return {"error": "Failed to parse response", "raw": text}
