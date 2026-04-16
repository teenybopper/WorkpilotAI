"""Email MCP tool adapter."""

import logging
from app.services.mcp.base import MCPToolAdapter, ToolCapability

logger = logging.getLogger(__name__)


class EmailAdapter(MCPToolAdapter):
    tool_type = "email"
    display_name = "Email"
    description = "Draft and send follow-up emails"
    auth_type = "api_key"

    def discover_capabilities(self) -> list[ToolCapability]:
        return [
            ToolCapability("send_email", "Send a follow-up email", ["send_message"]),
            ToolCapability("draft_email", "Draft an email for review", ["send_message"]),
        ]

    def execute(self, action_type: str, payload: dict, tool_config: dict, auth_config: str | None) -> dict:
        if action_type == "send_message":
            logger.info(f"[Email] Would send email to {payload.get('to', 'unknown')}")
            return {
                "action": "send_email",
                "to": payload.get("to", ""),
                "subject": payload.get("subject", ""),
                "body_preview": (payload.get("body", ""))[:200],
                "status": "simulated",
            }

        return {"status": "unsupported", "message": f"Action type '{action_type}' not supported"}

    def validate_connection(self, tool_config: dict, auth_config: str | None) -> bool:
        return bool(auth_config)

    def get_config_fields(self) -> list[dict]:
        return [
            {"name": "smtp_host", "type": "string", "required": True, "description": "SMTP server host"},
            {"name": "smtp_port", "type": "number", "required": True, "description": "SMTP server port"},
            {"name": "from_email", "type": "email", "required": True, "description": "Sender email address"},
            {"name": "password", "type": "secret", "required": True, "description": "Email password or app password"},
        ]
