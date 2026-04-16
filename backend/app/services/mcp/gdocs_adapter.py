"""Google Docs MCP tool adapter."""

import logging
from app.services.mcp.base import MCPToolAdapter, ToolCapability

logger = logging.getLogger(__name__)


class GDocsAdapter(MCPToolAdapter):
    tool_type = "google_docs"
    display_name = "Google Docs"
    description = "Create and update Google Docs documents"
    auth_type = "oauth"

    def discover_capabilities(self) -> list[ToolCapability]:
        return [
            ToolCapability("create_doc", "Create a new Google Doc", ["create_doc"]),
            ToolCapability("update_doc", "Append or update content in a Google Doc", ["update_doc"]),
        ]

    def execute(self, action_type: str, payload: dict, tool_config: dict, auth_config: str | None) -> dict:
        if action_type == "create_doc":
            logger.info(f"[GDocs] Would create doc: {payload.get('title', 'Untitled')}")
            return {
                "action": "create_doc",
                "title": payload.get("title", "Untitled"),
                "content_preview": (payload.get("content", ""))[:200],
                "status": "simulated",
            }
        elif action_type == "update_doc":
            doc_id = payload.get("doc_id", "unknown")
            logger.info(f"[GDocs] Would update doc {doc_id}")
            return {
                "action": "update_doc",
                "doc_id": doc_id,
                "status": "simulated",
            }

        return {"status": "unsupported", "message": f"Action type '{action_type}' not supported"}

    def validate_connection(self, tool_config: dict, auth_config: str | None) -> bool:
        return bool(auth_config)

    def get_config_fields(self) -> list[dict]:
        return [
            {"name": "folder_id", "type": "string", "required": False, "description": "Default Google Drive folder ID"},
        ]
