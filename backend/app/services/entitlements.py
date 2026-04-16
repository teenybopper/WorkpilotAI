"""Entitlements service — plan-based feature gating."""

import logging
from uuid import UUID
from sqlalchemy.orm import Session

from app.models import User, Organization, PlanTier

logger = logging.getLogger(__name__)


# ── Feature definitions per plan tier ─────────────────────────────────────

PLAN_FEATURES = {
    PlanTier.FREE: {
        "meetops_upload": True,
        "meetops_local_listener": True,
        "meetops_bot_join": False,
        "actionops_propose": True,
        "actionops_auto_execute": False,
        "max_connected_tools": 2,
        "max_workspaces": 5,
        "max_sources_per_workspace": 20,
        "cross_source_query": True,
        "conflict_detection": True,
        "audit_trail": False,
    },
    PlanTier.PRO: {
        "meetops_upload": True,
        "meetops_local_listener": True,
        "meetops_bot_join": True,
        "actionops_propose": True,
        "actionops_auto_execute": True,
        "max_connected_tools": 10,
        "max_workspaces": 25,
        "max_sources_per_workspace": 100,
        "cross_source_query": True,
        "conflict_detection": True,
        "audit_trail": True,
    },
    PlanTier.BUSINESS: {
        "meetops_upload": True,
        "meetops_local_listener": True,
        "meetops_bot_join": True,
        "actionops_propose": True,
        "actionops_auto_execute": True,
        "max_connected_tools": 50,
        "max_workspaces": 100,
        "max_sources_per_workspace": 500,
        "cross_source_query": True,
        "conflict_detection": True,
        "audit_trail": True,
    },
    PlanTier.ENTERPRISE: {
        "meetops_upload": True,
        "meetops_local_listener": True,
        "meetops_bot_join": True,
        "actionops_propose": True,
        "actionops_auto_execute": True,
        "max_connected_tools": -1,  # unlimited
        "max_workspaces": -1,
        "max_sources_per_workspace": -1,
        "cross_source_query": True,
        "conflict_detection": True,
        "audit_trail": True,
    },
}


def get_plan_features(tier: PlanTier) -> dict:
    """Get the feature set for a subscription tier."""
    return PLAN_FEATURES.get(tier, PLAN_FEATURES[PlanTier.FREE])


def check_feature(org: Organization, feature_name: str) -> bool:
    """Check if an organization's plan includes a specific feature."""
    features = get_plan_features(org.plan_tier)
    value = features.get(feature_name)
    if value is None:
        logger.warning(f"Unknown feature: {feature_name}")
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0  # -1 = unlimited, 0 = disabled
    return bool(value)


def check_feature_limit(org: Organization, feature_name: str) -> int:
    """Get the numeric limit for a feature. Returns -1 for unlimited."""
    features = get_plan_features(org.plan_tier)
    return features.get(feature_name, 0)


def get_default_user(db: Session) -> User:
    """Get or create a default user for single-user MVP mode."""
    user = db.query(User).first()
    if not user:
        user = User(
            email="default@workpilot.ai",
            name="Default User",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Created default user for MVP mode")
    return user
