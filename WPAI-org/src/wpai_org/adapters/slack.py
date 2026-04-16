"""Slack adapter — bot joins Slack Huddles via Bolt SDK.

NOTE: Slack Huddle audio capture requires Slack Enterprise Grid
and is not available via the standard Bolt SDK. This adapter
provides the contract for when the API becomes available.
"""

import logging
from wpai_org.adapters.base import (
    ProviderAdapter, MeetingInfo, AuthResult, JoinResult
)

logger = logging.getLogger(__name__)


class SlackAdapter(ProviderAdapter):
    """Slack Huddles bot adapter."""

    @property
    def provider_name(self) -> str:
        return "Slack"

    async def authenticate(self, credentials: dict) -> AuthResult:
        logger.info("Authenticating with Slack")
        # TODO: OAuth2 via Slack Bolt SDK
        return AuthResult(success=True, token="slack_placeholder_token")

    async def join_meeting(self, meeting_info: MeetingInfo) -> JoinResult:
        logger.info(f"Joining Slack Huddle: {meeting_info.meeting_url}")
        # TODO: Join huddle via Slack RTM/Events API
        return JoinResult(success=True, provider_session_id="slack_session_placeholder")

    async def start_audio_capture(self, session_id: str) -> None:
        logger.info(f"Starting Slack audio capture for {session_id}")

    async def stop_audio_capture(self, session_id: str) -> None:
        logger.info(f"Stopping Slack audio capture for {session_id}")

    async def leave_meeting(self, session_id: str) -> None:
        logger.info(f"Leaving Slack Huddle for {session_id}")

    async def get_status(self, session_id: str) -> str:
        return "disconnected"
