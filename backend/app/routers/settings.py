"""Settings router — plan info, entitlements, and execution policies."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import UserPlanResponse, ExecutionPoliciesUpdate
from app.services.entitlements import get_plan_features
from app.routers.auth import get_current_user
from app.services.auth import get_user_org
from app.models import PlanTier

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("/plan", response_model=UserPlanResponse)
async def get_current_plan(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the current user's subscription plan and features."""
    org = get_user_org(db, user.id)
    plan = org.plan_tier if org else PlanTier.FREE
    features = get_plan_features(plan)
    return UserPlanResponse(
        plan_tier=plan,
        features=features,
    )


@router.get("/entitlements")
async def get_entitlements(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get feature flags for the current user's plan."""
    org = get_user_org(db, user.id)
    plan = org.plan_tier if org else PlanTier.FREE
    features = get_plan_features(plan)
    return {
        "tier": plan.value,
        "features": features,
    }


@router.put("/policies")
async def update_policies(
    request: ExecutionPoliciesUpdate,
    user=Depends(get_current_user),
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
async def get_policies(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current execution policies."""
    settings = user.settings_json or {}
    policies = settings.get("execution_policies", {
        "auto_execute_low_risk": False,
        "require_review_all": True,
        "max_daily_auto_executions": 10,
    })
    return {"policies": policies}
