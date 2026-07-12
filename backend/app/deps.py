from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import Profile, User, UserSkill
from app.utils.security import decode_token

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = (
        db.query(User)
        .options(
            joinedload(User.profile).selectinload(Profile.skills).joinedload(UserSkill.skill),
            joinedload(User.profile).selectinload(Profile.photos),
        )
        .filter(User.id == payload.get("sub"))
        .first()
    )
    if not user or user.status.value != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        return None
    return (
        db.query(User)
        .options(
            joinedload(User.profile).selectinload(Profile.skills).joinedload(UserSkill.skill),
            joinedload(User.profile).selectinload(Profile.photos),
        )
        .filter(User.id == payload.get("sub"))
        .first()
    )


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "super_admin", "tenant_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
