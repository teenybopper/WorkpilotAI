"""WorkPilot AI — User router (local desktop, no authentication)."""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth import get_or_create_local_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["User"])


def get_local_user(db: Session = Depends(get_db)):
    """Dependency that returns the single local user. No auth required."""
    return get_or_create_local_user(db)


@router.get("/me")
async def me_endpoint(user=Depends(get_local_user)):
    """Get the local user profile."""
    return {
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
        },
    }


@router.put("/me")
async def update_me(
    name: str = None,
    email: str = None,
    user=Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """Update the local user profile."""
    if name:
        user.name = name
    if email:
        user.email = email
    db.commit()
    db.refresh(user)
    return {
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
        },
    }
