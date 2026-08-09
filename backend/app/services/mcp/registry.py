"""MCP tool registry — discovers and dispatches to tool adapters."""

import logging
from app.services.mcp.base import MCPToolAdapter

logger = logging.getLogger(__name__)

# ── Adapter registry ──────────────────────────────────────────────────────

_adapters: dict[str, MCPToolAdapter] = {}


def register_adapter(adapter: MCPToolAdapter):
    """Register a tool adapter in the global registry."""
    _adapters[adapter.tool_type] = adapter
    logger.info(f"Registered MCP adapter: {adapter.tool_type} ({adapter.display_name})")


def get_adapter(tool_type: str) -> MCPToolAdapter:
    """Get an adapter by tool type."""
    adapter = _adapters.get(tool_type)
    if not adapter:
        raise ValueError(f"No adapter registered for tool type: {tool_type}")
    return adapter


def list_available_tools() -> list[dict]:
    """List all available tool types with their capabilities."""
    return [adapter.to_info_dict() for adapter in _adapters.values()]


def list_registered_types() -> list[str]:
    """List all registered tool type keys."""
    return list(_adapters.keys())


# ── Auto-register built-in adapters ───────────────────────────────────────

def _register_builtins():
    """Register all built-in adapters on import."""
    from app.services.mcp.jira_adapter import JiraAdapter
    from app.services.mcp.slack_adapter import SlackAdapter
    from app.services.mcp.gdocs_adapter import GDocsAdapter
    from app.services.mcp.email_adapter import EmailAdapter
    from app.services.mcp.gcal_adapter import GCalendarAdapter

    register_adapter(JiraAdapter())
    register_adapter(SlackAdapter())
    register_adapter(GDocsAdapter())
    register_adapter(EmailAdapter())
    register_adapter(GCalendarAdapter())


try:
    _register_builtins()
except Exception as e:
    logger.warning(f"Failed to register some MCP adapters: {e}")
