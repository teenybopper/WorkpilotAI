"""Google Calendar MCP tool adapter."""

import logging
from app.services.mcp.base import MCPToolAdapter, ToolCapability

logger = logging.getLogger(__name__)


class GCalendarAdapter(MCPToolAdapter):
    tool_type = "google_calendar"
    display_name = "Google Calendar"
    description = "Schedule meetings and manage calendar events"
    auth_type = "oauth"

    def discover_capabilities(self) -> list[ToolCapability]:
        return [
            ToolCapability(
                "schedule_meeting",
                "Schedule a follow-up calendar meeting with participants",
                ["schedule_meeting"],
            ),
        ]

    def execute(self, action_type: str, payload: dict, tool_config: dict, auth_config: str | None) -> dict:
        if action_type == "schedule_meeting":
            title = payload.get("title", "Follow-up Meeting")
            participants = payload.get("participants", [])
            proposed_time = payload.get("proposed_time", "TBD")
            purpose = payload.get("purpose", "")

            logger.info(f"[GCalendar] Scheduling meeting '{title}' with {participants} at {proposed_time}")

            return {
                "action": "schedule_meeting",
                "title": title,
                "participants": participants,
                "proposed_time": proposed_time,
                "purpose": purpose,
                "event_id": f"gcal_evt_{title.lower().replace(' ', '_')[:20]}",
                "status": "simulated",
                "message": f"Successfully scheduled '{title}' for {proposed_time}.",
            }

        return {"status": "unsupported", "message": f"Action type '{action_type}' not supported by Google Calendar adapter"}

    def validate_connection(self, tool_config: dict, auth_config: str | None) -> bool:
        return bool(auth_config)

    def get_config_fields(self) -> list[dict]:
        return [
            {"name": "calendar_id", "type": "string", "required": False, "description": "Target Google Calendar ID (defaults to 'primary')"},
            {"name": "timezone", "type": "string", "required": False, "description": "Default timezone (e.g. 'America/New_York' or 'UTC')"},
        ]
