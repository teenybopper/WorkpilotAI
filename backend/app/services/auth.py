"""WorkPilot AI — Authentication & authorization service (JWT + bcrypt)."""

import uuid
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt, JWTError
import bcrypt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import (
    User, Organization, OrganizationMember, InviteCode,
    RefreshToken, AccountType, PlanTier, OrgRole,
)

# ── Password hashing ─────────────────────────────────────────────────────

SECRET_KEY = getattr(settings, "secret_key", "workpilot-dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = str(bcrypt.hashpw(password.encode("utf-8"), salt), "utf-8")
    return hashed


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


# ── JWT ───────────────────────────────────────────────────────────────────

def create_access_token(user_id: str, extra: dict = None) -> str:
    payload = {
        "sub": str(user_id),
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.utcnow(),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token() -> str:
    return secrets.token_urlsafe(64)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


# ── User CRUD ─────────────────────────────────────────────────────────────

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: uuid.UUID) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def signup_individual(db: Session, name: str, email: str, password: str) -> User:
    user = User(
        name=name,
        email=email.lower().strip(),
        password_hash=hash_password(password),
        account_type=AccountType.INDIVIDUAL,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def signup_organization(
    db: Session,
    admin_name: str,
    admin_email: str,
    password: str,
    org_name: str,
    org_size: str = "small",
) -> dict:
    # Create admin user
    user = User(
        name=admin_name,
        email=admin_email.lower().strip(),
        password_hash=hash_password(password),
        account_type=AccountType.ORGANIZATION,
    )
    db.add(user)
    db.flush()

    # Derive slug
    slug = org_name.lower().replace(" ", "-").replace("_", "-")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")
    existing = db.query(Organization).filter(Organization.slug == slug).first()
    if existing:
        slug = f"{slug}-{secrets.token_hex(3)}"

    # Extract email domain for auto-join (skip common free email providers)
    email_domain = admin_email.lower().strip().split("@")[-1]
    free_domains = {
        "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
        "protonmail.com", "icloud.com", "aol.com", "mail.com",
    }
    org_domain = email_domain if email_domain not in free_domains else None

    # Determine plan limits by org size
    size_map = {"small": 5, "medium": 20, "large": 50, "enterprise": 200}
    max_seats = size_map.get(org_size, 5)

    org = Organization(
        name=org_name,
        slug=slug,
        domain=org_domain,
        admin_user_id=user.id,
        plan_tier=PlanTier.FREE,
        max_seats=max_seats,
    )
    db.add(org)
    db.flush()

    # Add admin as member
    member = OrganizationMember(
        org_id=org.id,
        user_id=user.id,
        role=OrgRole.ADMIN,
    )
    db.add(member)

    # Generate initial invite code
    code = generate_invite_code(db, org.id, user.id, max_uses=max_seats)

    db.commit()
    db.refresh(user)
    db.refresh(org)

    return {"user": user, "organization": org, "invite_code": code}


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email.lower().strip())
    if not user or not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user


# ── Refresh tokens ────────────────────────────────────────────────────────

def store_refresh_token(db: Session, user_id: uuid.UUID, raw_token: str, device: str = None) -> RefreshToken:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    rt = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        device_info=device,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()
    return rt


def validate_refresh_token(db: Session, raw_token: str) -> Optional[RefreshToken]:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    rt = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked == False,
        RefreshToken.expires_at > datetime.utcnow(),
    ).first()
    return rt


def revoke_refresh_token(db: Session, raw_token: str):
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    rt = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if rt:
        rt.revoked = True
        db.commit()


# ── Invite codes ──────────────────────────────────────────────────────────

def generate_invite_code(
    db: Session,
    org_id: uuid.UUID,
    created_by: uuid.UUID,
    email: str = None,
    max_uses: int = 10,
    expires_days: int = 30,
) -> str:
    code = secrets.token_urlsafe(8).upper()[:8]
    invite = InviteCode(
        org_id=org_id,
        code=code,
        created_by=created_by,
        email=email,
        max_uses=max_uses,
        expires_at=datetime.utcnow() + timedelta(days=expires_days),
    )
    db.add(invite)
    db.flush()
    return code


def join_org_with_code(
    db: Session, name: str, email: str, password: str, invite_code: str
) -> dict:
    # Validate invite code
    invite = db.query(InviteCode).filter(
        InviteCode.code == invite_code,
        InviteCode.is_active == True,
    ).first()

    if not invite:
        raise ValueError("Invalid invite code")
    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise ValueError("Invite code has expired")
    if invite.uses >= invite.max_uses:
        raise ValueError("Invite code has reached maximum uses")
    if invite.email and invite.email.lower() != email.lower():
        raise ValueError("This invite code is for a different email address")

    org = db.query(Organization).filter(Organization.id == invite.org_id).first()
    if not org:
        raise ValueError("Organization not found")

    # Check seat limit
    member_count = db.query(OrganizationMember).filter(
        OrganizationMember.org_id == org.id
    ).count()
    if member_count >= org.max_seats:
        raise ValueError("Organization has reached maximum seats")

    # Create user
    user = User(
        name=name,
        email=email.lower().strip(),
        password_hash=hash_password(password),
        account_type=AccountType.ORGANIZATION,
    )
    db.add(user)
    db.flush()

    # Add as member
    member = OrganizationMember(
        org_id=org.id,
        user_id=user.id,
        role=OrgRole.MEMBER,
        invited_by=invite.created_by,
    )
    db.add(member)

    # Increment invite uses
    invite.uses += 1
    if invite.uses >= invite.max_uses:
        invite.is_active = False

    db.commit()
    db.refresh(user)

    return {"user": user, "organization": org}


# ── Org queries ───────────────────────────────────────────────────────────

def get_user_org(db: Session, user_id: uuid.UUID) -> Optional[Organization]:
    member = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == user_id
    ).first()
    if member:
        return db.query(Organization).filter(Organization.id == member.org_id).first()
    return None


def get_org_members(db: Session, org_id: uuid.UUID) -> list:
    members = db.query(OrganizationMember).filter(
        OrganizationMember.org_id == org_id
    ).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            result.append({
                "id": str(m.id),
                "user_id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": m.role.value,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            })
    return result


def try_auto_join_org(db: Session, user: User) -> Optional[Organization]:
    """Auto-join a user to an organization if their email domain matches.

    Called during login/signup for individual users. If we find an org
    with a matching domain, add the user as a member and upgrade them
    to organization account type.
    """
    email_domain = user.email.split("@")[-1].lower()
    if not email_domain:
        return None

    org = db.query(Organization).filter(
        Organization.domain == email_domain,
    ).first()
    if not org:
        return None

    # Check if already a member
    existing = db.query(OrganizationMember).filter(
        OrganizationMember.org_id == org.id,
        OrganizationMember.user_id == user.id,
    ).first()
    if existing:
        return org

    # Check seat limit
    member_count = db.query(OrganizationMember).filter(
        OrganizationMember.org_id == org.id,
    ).count()
    if member_count >= org.max_seats:
        return None  # Org full, don't auto-join

    # Add as member
    member = OrganizationMember(
        org_id=org.id,
        user_id=user.id,
        role=OrgRole.MEMBER,
    )
    db.add(member)

    # Upgrade account type
    user.account_type = AccountType.ORGANIZATION
    db.commit()
    db.refresh(user)

    return org
