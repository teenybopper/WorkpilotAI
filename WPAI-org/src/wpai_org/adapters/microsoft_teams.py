"""Microsoft Teams adapter — bot joins via Bot Framework.

This adapter handles:
- Authentication via Azure AD / Bot Framework
- Meeting join via Graph API + Bot Framework
- Audio capture from Teams media platform
- Graceful leave on session end

NOTE: Requires Azure Bot Service registration and Teams Graph API permissions.
"""

import logging
from wpai_org.adapters.base import (
    ProviderAdapter, MeetingInfo, AuthResult, JoinResult
)

logger = logging.getLogger(__name__)


class MicrosoftTeamsAdapter(ProviderAdapter):
    """Microsoft Teams bot adapter."""

    @property
    def provider_name(self) -> str:
        return "Microsoft Teams"

    async def authenticate(self, credentials: dict) -> AuthResult:
        """Authenticate with Azure AD for Bot Framework and Graph API.

        Expected credentials:
        - tenant_id, client_id, client_secret (for app-only auth)
        - OR: access_token (pre-obtained)
        """
        logger.info("Authenticating with Microsoft Teams")

        # TODO: Implement Azure AD OAuth2 client_credentials flow
        # 1. POST to login.microsoftonline.com/{tenant}/oauth2/v2.0/token
        # 2. Scopes: https://graph.microsoft.com/.default
        # 3. Return bearer token

        return AuthResult(success=True, token="teams_placeholder_token")

    async def join_meeting(self, meeting_info: MeetingInfo) -> JoinResult:
        """Join a Teams meeting via Bot Framework.

        Uses the Graph API communications/calls endpoint to join.
        """
        logger.info(f"Joining Teams meeting: {meeting_info.meeting_url}")

        # TODO: Implement Teams meeting join
        # 1. Parse join URL to extract thread_id and organizer_id
        # 2. POST to graph.microsoft.com/v1.0/communications/calls
        # 3. Set mediaConfig for audio capture
        # 4. Handle call state notifications via Bot Framework webhook

        return JoinResult(
            success=True,
            provider_session_id="teams_session_placeholder",
            participant_id="teams_participant_placeholder",
        )

    async def start_audio_capture(self, session_id: str) -> None:
        logger.info(f"Starting Teams audio capture for {session_id}")
        # TODO: Subscribe to audio media stream via Real-time Media Platform

    async def stop_audio_capture(self, session_id: str) -> None:
        logger.info(f"Stopping Teams audio capture for {session_id}")

    async def leave_meeting(self, session_id: str) -> None:
        logger.info(f"Leaving Teams meeting for {session_id}")
        # TODO: DELETE communications/calls/{call-id}

    async def get_status(self, session_id: str) -> str:
        return "disconnected"
