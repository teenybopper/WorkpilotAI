"""WorkPilot AI — Local user service (no authentication required)."""

import logging
from sqlalchemy.orm import Session

from app.models.models import User

logger = logging.getLogger(__name__)


def get_or_create_local_user(db: Session) -> User:
    """Get or create the single local user.

    In the local desktop app, there's only one user — no login required.
    This function is the replacement for all previous auth logic.
    """
    user = db.query(User).first()
    if not user:
        user = User(
            email="local@workpilot.ai",
            name="Local User",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Created local user for desktop app")
    return user
