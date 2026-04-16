"""Jira MCP tool adapter."""

import logging
from app.services.mcp.base import MCPToolAdapter, ToolCapability

logger = logging.getLogger(__name__)


class JiraAdapter(MCPToolAdapter):
    tool_type = "jira"
    display_name = "Jira"
    description = "Create and update Jira issues, stories, and epics"
    auth_type = "api_key"

    def discover_capabilities(self) -> list[ToolCapability]:
        return [
            ToolCapability("create_issue", "Create a new Jira issue", ["create_task"]),
            ToolCapability("update_issue", "Update an existing Jira issue", ["update_task"]),
            ToolCapability("add_comment", "Add a comment to a Jira issue", ["update_task"]),
            ToolCapability("transition_issue", "Move issue to a different status", ["update_task"]),
        ]

    def execute(self, action_type: str, payload: dict, tool_config: dict, auth_config: str | None) -> dict:
        """Execute a Jira action. In production, this calls the Jira REST API."""
        project_key = tool_config.get("project_key", "PROJ")

        if action_type == "create_task":
            # TODO: Replace with actual Jira API call
            logger.info(f"[Jira] Would create issue in {project_key}: {payload.get('summary', 'N/A')}")
            return {
                "action": "create_issue",
                "project": project_key,
                "summary": payload.get("summary", ""),
                "description": payload.get("description", ""),
                "issue_type": payload.get("issue_type", "Task"),
                "status": "simulated",
                "message": f"Simulated: Would create Jira issue in {project_key}",
            }

        elif action_type == "update_task":
            issue_key = payload.get("issue_key", "UNKNOWN")
            logger.info(f"[Jira] Would update issue {issue_key}")
            return {
                "action": "update_issue",
                "issue_key": issue_key,
                "updates": payload,
                "status": "simulated",
                "message": f"Simulated: Would update Jira issue {issue_key}",
            }

        else:
            return {"status": "unsupported", "message": f"Action type '{action_type}' not supported by Jira adapter"}

    def validate_connection(self, tool_config: dict, auth_config: str | None) -> bool:
        # TODO: Actually call Jira API to verify credentials
        return bool(auth_config)

    def get_config_fields(self) -> list[dict]:
        return [
            {"name": "base_url", "type": "url", "required": True, "description": "Jira instance URL (e.g., https://yourorg.atlassian.net)"},
            {"name": "project_key", "type": "string", "required": True, "description": "Default project key (e.g., PROJ)"},
            {"name": "email", "type": "email", "required": True, "description": "Jira account email"},
            {"name": "api_token", "type": "secret", "required": True, "description": "Jira API token"},
        ]
