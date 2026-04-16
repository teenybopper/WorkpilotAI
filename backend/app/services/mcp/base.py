"""Base class for MCP tool adapters."""

from abc import ABC, abstractmethod
from typing import Any


class ToolCapability:
    """Describes a single capability of a connected tool."""

    def __init__(self, name: str, description: str, action_types: list[str]):
        self.name = name
        self.description = description
        self.action_types = action_types

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "action_types": self.action_types,
        }


class ExecutionResult:
    """Result of executing an action via a tool adapter."""

    def __init__(self, success: bool, data: dict | None = None, error: str | None = None):
        self.success = success
        self.data = data or {}
        self.error = error

    def to_dict(self) -> dict:
        result = {"success": self.success, "data": self.data}
        if self.error:
            result["error"] = self.error
        return result


class MCPToolAdapter(ABC):
    """Abstract base class for all MCP tool adapters."""

    tool_type: str = ""
    display_name: str = ""
    description: str = ""
    auth_type: str = "api_key"  # oauth, api_key, token

    @abstractmethod
    def discover_capabilities(self) -> list[ToolCapability]:
        """Return the list of capabilities this tool supports."""
        ...

    @abstractmethod
    def execute(
        self,
        action_type: str,
        payload: dict,
        tool_config: dict,
        auth_config: str | None,
    ) -> dict:
        """Execute an action and return the result."""
        ...

    @abstractmethod
    def validate_connection(self, tool_config: dict, auth_config: str | None) -> bool:
        """Validate that the tool connection is working."""
        ...

    def get_config_fields(self) -> list[dict]:
        """Return the configuration fields needed for this tool."""
        return []

    def to_info_dict(self) -> dict:
        """Serialize tool info for the available-tools API."""
        return {
            "tool_type": self.tool_type,
            "display_name": self.display_name,
            "description": self.description,
            "capabilities": [c.name for c in self.discover_capabilities()],
            "auth_type": self.auth_type,
            "config_fields": self.get_config_fields(),
        }
