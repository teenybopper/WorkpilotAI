"""Slack MCP tool adapter."""

import logging
from app.services.mcp.base import MCPToolAdapter, ToolCapability

logger = logging.getLogger(__name__)


class SlackAdapter(MCPToolAdapter):
    tool_type = "slack"
    display_name = "Slack"
    description = "Send messages and summaries to Slack channels"
    auth_type = "oauth"

    def discover_capabilities(self) -> list[ToolCapability]:
        return [
            ToolCapability("send_message", "Send a message to a Slack channel", ["send_message"]),
            ToolCapability("post_summary", "Post a meeting summary to a channel", ["send_message"]),
        ]

    def execute(self, action_type: str, payload: dict, tool_config: dict, auth_config: str | None) -> dict:
        channel = payload.get("channel", tool_config.get("default_channel", "#general"))

        if action_type == "send_message":
            logger.info(f"[Slack] Would send message to {channel}")
            return {
                "action": "send_message",
                "channel": channel,
                "message": payload.get("message", ""),
                "status": "simulated",
                "message_preview": (payload.get("message", ""))[:100],
            }

        return {"status": "unsupported", "message": f"Action type '{action_type}' not supported by Slack adapter"}

    def validate_connection(self, tool_config: dict, auth_config: str | None) -> bool:
        return bool(auth_config)

    def get_config_fields(self) -> list[dict]:
        return [
            {"name": "workspace_url", "type": "url", "required": True, "description": "Slack workspace URL"},
            {"name": "default_channel", "type": "string", "required": False, "description": "Default channel for messages"},
            {"name": "bot_token", "type": "secret", "required": True, "description": "Slack Bot OAuth token"},
        ]
