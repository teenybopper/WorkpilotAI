"""Discord adapter — bot joins voice channels via discord.py.

Uses discord.py to join voice channels and capture audio
via the voice receive functionality.
"""

import logging
from wpai_org.adapters.base import (
    ProviderAdapter, MeetingInfo, AuthResult, JoinResult
)

logger = logging.getLogger(__name__)


class DiscordAdapter(ProviderAdapter):
    """Discord voice channel bot adapter."""

    @property
    def provider_name(self) -> str:
        return "Discord"

    async def authenticate(self, credentials: dict) -> AuthResult:
        logger.info("Authenticating with Discord")
        # TODO: Bot token authentication
        return AuthResult(success=True, token="discord_placeholder_token")

    async def join_meeting(self, meeting_info: MeetingInfo) -> JoinResult:
        logger.info(f"Joining Discord voice channel: {meeting_info.meeting_url}")
        # TODO: Parse guild_id/channel_id from URL, join via discord.py VoiceClient
        return JoinResult(success=True, provider_session_id="discord_session_placeholder")

    async def start_audio_capture(self, session_id: str) -> None:
        logger.info(f"Starting Discord audio capture for {session_id}")
        # TODO: Use VoiceClient.listen() with AudioSink

    async def stop_audio_capture(self, session_id: str) -> None:
        logger.info(f"Stopping Discord audio capture for {session_id}")

    async def leave_meeting(self, session_id: str) -> None:
        logger.info(f"Leaving Discord voice channel for {session_id}")
        # TODO: VoiceClient.disconnect()

    async def get_status(self, session_id: str) -> str:
        return "disconnected"
