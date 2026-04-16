"""WorkPilot AI — Auth API router (signup, login, refresh, me, org)."""

import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth import (
    signup_individual,
    signup_organization,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    store_refresh_token,
    validate_refresh_token,
    revoke_refresh_token,
    decode_access_token,
    get_user_by_id,
    get_user_by_email,
    get_user_org,
    get_org_members,
    generate_invite_code,
    join_org_with_code,
    try_auto_join_org,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Schemas ───────────────────────────────────────────────────────────────

class SignupIndividualRequest(BaseModel):
    name: str
    email: str
    password: str = Field(..., max_length=72)


class SignupOrgRequest(BaseModel):
    admin_name: str
    admin_email: str
    password: str = Field(..., max_length=72)
    org_name: str
    org_size: str = "small"  # small, medium, large, enterprise


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class JoinOrgRequest(BaseModel):
    name: str
    email: str
    password: str
    invite_code: str


class InviteRequest(BaseModel):
    email: Optional[str] = None
    max_uses: int = 10


# ── Helpers ───────────────────────────────────────────────────────────────

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Extract and validate the current user from the Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = get_user_by_id(db, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


def _build_auth_response(user, db: Session, org=None):
    """Build the standard auth response with tokens and user/org info."""
    org_data = None
    if not org:
        org = get_user_org(db, user.id)

    if org:
        org_data = {
            "id": str(org.id),
            "name": org.name,
            "slug": org.slug,
            "plan_tier": org.plan_tier.value,
            "max_seats": org.max_seats,
        }

    access_token = create_access_token(str(user.id))
    raw_refresh = create_refresh_token()
    store_refresh_token(db, user.id, raw_refresh)

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "account_type": user.account_type.value,
            "avatar_url": user.avatar_url,
        },
        "organization": org_data,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.post("/signup/individual")
async def signup_individual_endpoint(body: SignupIndividualRequest, db: Session = Depends(get_db)):
    """Sign up as an individual user."""
    existing = get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = signup_individual(db, body.name, body.email, body.password)

    # Auto-join org if email domain matches a registered organization
    auto_org = try_auto_join_org(db, user)
    if auto_org:
        logger.info(f"Auto-joined {user.email} to org {auto_org.name} (domain match)")

    logger.info(f"Individual signup: {user.email}")
    return _build_auth_response(user, db, auto_org)


@router.post("/signup/organization")
async def signup_org_endpoint(body: SignupOrgRequest, db: Session = Depends(get_db)):
    """Sign up as an organization admin."""
    existing = get_user_by_email(db, body.admin_email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    result = signup_organization(
        db, body.admin_name, body.admin_email, body.password,
        body.org_name, body.org_size,
    )
    resp = _build_auth_response(result["user"], db, result["organization"])
    resp["invite_code"] = result["invite_code"]
    logger.info(f"Org signup: {result['organization'].name} by {result['user'].email}")
    return resp


@router.post("/login")
async def login_endpoint(body: LoginRequest, db: Session = Depends(get_db)):
    """Log in with email and password."""
    user = authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Auto-join org if email domain matches (handles users who signed up
    # before the org was created or before domain matching existed)
    if user.account_type.value == "individual":
        auto_org = try_auto_join_org(db, user)
        if auto_org:
            logger.info(f"Auto-joined {user.email} to org {auto_org.name} on login")

    logger.info(f"Login: {user.email}")
    return _build_auth_response(user, db)


@router.post("/refresh")
async def refresh_endpoint(body: RefreshRequest, db: Session = Depends(get_db)):
    """Refresh an access token."""
    rt = validate_refresh_token(db, body.refresh_token)
    if not rt:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = get_user_by_id(db, rt.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Revoke old token and issue new pair
    revoke_refresh_token(db, body.refresh_token)
    return _build_auth_response(user, db)


@router.get("/me")
async def me_endpoint(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the current authenticated user and their org."""
    org = get_user_org(db, user.id)
    org_data = None
    if org:
        org_data = {
            "id": str(org.id),
            "name": org.name,
            "slug": org.slug,
            "plan_tier": org.plan_tier.value,
            "max_seats": org.max_seats,
        }

    return {
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "account_type": user.account_type.value,
            "avatar_url": user.avatar_url,
        },
        "organization": org_data,
    }


@router.post("/logout")
async def logout_endpoint(body: RefreshRequest, db: Session = Depends(get_db)):
    """Revoke a refresh token (logout)."""
    revoke_refresh_token(db, body.refresh_token)
    return {"message": "Logged out"}


@router.post("/join-org")
async def join_org_endpoint(body: JoinOrgRequest, db: Session = Depends(get_db)):
    """Join an organization with an invite code."""
    existing = get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        result = join_org_with_code(db, body.name, body.email, body.password, body.invite_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    logger.info(f"Joined org: {result['user'].email} → {result['organization'].name}")
    return _build_auth_response(result["user"], db, result["organization"])


# ── Organization management ──────────────────────────────────────────────

@router.get("/org/members")
async def org_members_endpoint(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get members of the current user's organization."""
    org = get_user_org(db, user.id)
    if not org:
        raise HTTPException(status_code=404, detail="No organization found")
    members = get_org_members(db, org.id)
    return {"members": members, "org_id": str(org.id)}


@router.post("/org/invite")
async def create_invite_endpoint(
    body: InviteRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a new invite code for the organization."""
    org = get_user_org(db, user.id)
    if not org:
        raise HTTPException(status_code=404, detail="No organization found")

    # Check if user is admin
    from app.models.models import OrganizationMember, OrgRole
    membership = db.query(OrganizationMember).filter(
        OrganizationMember.org_id == org.id,
        OrganizationMember.user_id == user.id,
    ).first()
    if not membership or membership.role != OrgRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can generate invite codes")

    code = generate_invite_code(db, org.id, user.id, body.email, body.max_uses)
    db.commit()
    return {"invite_code": code}
