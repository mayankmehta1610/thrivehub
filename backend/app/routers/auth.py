from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import Profile, Tenant, User, UserStatus
from app.schemas import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserOut
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.code == settings.default_tenant_code).first()
    if not tenant:
        raise HTTPException(status_code=500, detail="Tenant not configured")

    if db.query(User).filter(User.tenant_id == tenant.id, User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Profile).filter(Profile.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        tenant_id=tenant.id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    profile = Profile(
        user_id=user.id,
        username=payload.username,
        display_name=payload.display_name,
        avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",
        cover_url="https://images.unsplash.com/photo-1557683316-973673baf926?w=1200",
    )
    db.add(profile)
    db.commit()
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.code == settings.default_tenant_code).first()
    user = (
        db.query(User)
        .filter(User.tenant_id == tenant.id, User.email == payload.email)
        .first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    subject = data.get("sub")
    return TokenResponse(
        access_token=create_access_token(subject),
        refresh_token=create_refresh_token(subject),
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
