"""Bot token verification — validates service tokens with the WorkPilot backend."""

import httpx
import logging

from wpai_org.config import settings

logger = logging.getLogger(__name__)


async def verify_bot_token(token: str) -> bool:
    """Verify a bot service token with the WorkPilot backend.

    Args:
        token: Raw bot service token to verify.

    Returns:
        True if the token is valid and active.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.backend_url}/api/bot-service/verify",
                json={"bot_token": token},
                timeout=10.0,
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("valid", False)

            logger.warning(f"Token verification failed: HTTP {response.status_code}")
            return False

    except httpx.RequestError as e:
        logger.error(f"Token verification network error: {e}")
        return False
