"""Settings router — execution policies (local desktop, no plan tiers)."""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.routers.auth import get_local_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user-settings", tags=["User Settings"])


class ExecutionPoliciesUpdate(BaseModel):
    auto_execute_low_risk: Optional[bool] = None
    require_review_all: Optional[bool] = None
    max_daily_auto_executions: Optional[int] = None


@router.get("/plan")
async def get_current_plan():
    """In local mode, all features are unlocked."""
    return {
        "plan_tier": "local",
        "features": {
            "meetops_upload": True,
            "meetops_local_listener": True,
            "docops": True,
            "actionops_propose": True,
            "actionops_auto_execute": True,
            "max_workspaces": -1,
            "max_sources_per_workspace": -1,
            "cross_source_query": True,
            "conflict_detection": True,
        },
    }


@router.get("/entitlements")
async def get_entitlements():
    """All features unlocked in local mode."""
    return {
        "tier": "local",
        "features": {
            "meetops_upload": True,
            "meetops_local_listener": True,
            "docops": True,
            "actionops_propose": True,
            "actionops_auto_execute": True,
            "max_workspaces": -1,
            "max_sources_per_workspace": -1,
            "cross_source_query": True,
            "conflict_detection": True,
        },
    }


@router.put("/policies")
async def update_policies(
    request: ExecutionPoliciesUpdate,
    user=Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """Update execution policies for ActionOps."""
    settings = user.settings_json or {}
    policies = settings.get("execution_policies", {})

    if request.auto_execute_low_risk is not None:
        policies["auto_execute_low_risk"] = request.auto_execute_low_risk
    if request.require_review_all is not None:
        policies["require_review_all"] = request.require_review_all
    if request.max_daily_auto_executions is not None:
        policies["max_daily_auto_executions"] = request.max_daily_auto_executions

    settings["execution_policies"] = policies
    user.settings_json = settings
    db.commit()

    return {"status": "updated", "policies": policies}


@router.get("/policies")
async def get_policies(user=Depends(get_local_user), db: Session = Depends(get_db)):
    """Get current execution policies."""
    settings = user.settings_json or {}
    policies = settings.get("execution_policies", {
        "auto_execute_low_risk": False,
        "require_review_all": True,
        "max_daily_auto_executions": 10,
    })
    return {"policies": policies}
