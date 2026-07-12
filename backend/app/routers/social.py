"""Social publishing integrations.

Lets a user connect external channels (YouTube, Instagram, X, Facebook) from
their profile settings and cross-post content to them.

NOTE: `connect` here registers the connection intent (a foundation/demo).
Live publishing to each platform additionally requires a registered developer
app + OAuth credentials per provider (set via env vars) and each platform's
app review. Until those are configured, cross-post targets are recorded with
status "queued" rather than actually pushed to the external platform.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import SOCIAL_PROVIDERS, SocialConnection, User
from app.schemas import SocialConnectionOut, SocialConnectRequest

router = APIRouter(prefix="/me/social-connections", tags=["Integrations"])

PROVIDER_LABELS = {
    "youtube": "YouTube",
    "instagram": "Instagram",
    "x": "X",
    "facebook": "Facebook",
}


@router.get("", response_model=list[SocialConnectionOut])
def list_connections(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = {
        c.provider: c
        for c in db.query(SocialConnection).filter(SocialConnection.user_id == user.id).all()
    }
    return [
        SocialConnectionOut(
            provider=p,
            connected=p in rows,
            external_username=rows[p].external_username if p in rows else None,
            status=rows[p].status if p in rows else None,
        )
        for p in SOCIAL_PROVIDERS
    ]


@router.post("/{provider}", response_model=SocialConnectionOut)
def connect(
    provider: str,
    payload: SocialConnectRequest | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if provider not in SOCIAL_PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")
    conn = (
        db.query(SocialConnection)
        .filter(SocialConnection.user_id == user.id, SocialConnection.provider == provider)
        .first()
    )
    handle = (payload.external_username if payload else None) or (
        user.profile.username if user.profile else None
    )
    if not conn:
        conn = SocialConnection(
            tenant_id=user.tenant_id,
            user_id=user.id,
            provider=provider,
            external_username=handle,
            status="connected",
        )
        db.add(conn)
    else:
        conn.status = "connected"
        if handle:
            conn.external_username = handle
    db.commit()
    return SocialConnectionOut(
        provider=provider, connected=True, external_username=conn.external_username, status=conn.status
    )


@router.delete("/{provider}")
def disconnect(provider: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if provider not in SOCIAL_PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")
    db.query(SocialConnection).filter(
        SocialConnection.user_id == user.id, SocialConnection.provider == provider
    ).delete()
    db.commit()
    return {"status": "disconnected", "provider": provider}
