"""Provider adapters — abstract meeting bot interface.

Each provider (Google Meet, Teams, Slack, Discord) implements
the ProviderAdapter ABC to handle meeting join/leave/capture lifecycle.
"""

from wpai_org.adapters.base import ProviderAdapter
from wpai_org.adapters.google_meet import GoogleMeetAdapter
from wpai_org.adapters.microsoft_teams import MicrosoftTeamsAdapter
from wpai_org.adapters.slack import SlackAdapter
from wpai_org.adapters.discord import DiscordAdapter

# Provider registry
_ADAPTERS: dict[str, type[ProviderAdapter]] = {
    "google_meet": GoogleMeetAdapter,
    "microsoft_teams": MicrosoftTeamsAdapter,
    "slack": SlackAdapter,
    "discord": DiscordAdapter,
}


def get_adapter(provider: str) -> ProviderAdapter | None:
    """Get a provider adapter instance by name."""
    adapter_class = _ADAPTERS.get(provider)
    if adapter_class:
        return adapter_class()
    return None


def list_providers() -> list[dict]:
    """List all registered providers."""
    return [
        {"id": name, "name": cls.__doc__ or name, "supported": True}
        for name, cls in _ADAPTERS.items()
    ]
