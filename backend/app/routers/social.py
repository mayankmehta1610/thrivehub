"""Social publishing integrations.

Connect external channels (YouTube, Instagram, X, Facebook) and cross-post to them.

Two connect paths:
  * Live OAuth — used when a provider's API credentials are configured via env
    vars (e.g. YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET). `GET .../authorize`
    returns the provider's real OAuth consent URL; the provider redirects back
    to `GET .../callback`, which exchanges the code for tokens and stores them.
  * Demo — when a provider is NOT configured, a user may add a clearly-labelled
    demo connection (status="demo") to preview cross-posting. Demo connections
    are never published to the real platform; cross-post targets stay "queued".
"""
import secrets
import urllib.parse
from datetime import timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import SOCIAL_PROVIDERS, SocialConnection, User
from app.schemas import SocialConnectionOut, SocialConnectRequest
from app.utils.security import create_token, decode_token

router = APIRouter(tags=["Integrations"])

PROVIDER_LABELS = {"youtube": "YouTube", "instagram": "Instagram", "x": "X", "facebook": "Facebook"}

# Real OAuth2 endpoints per provider. client id/secret come from settings.
PROVIDER_OAUTH = {
    "youtube": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "scope": "https://www.googleapis.com/auth/youtube.upload",
        "extra_authorize": {"access_type": "offline", "prompt": "consent"},
    },
    "x": {
        "authorize_url": "https://twitter.com/i/oauth2/authorize",
        "token_url": "https://api.twitter.com/2/oauth2/token",
        "scope": "tweet.read tweet.write users.read offline.access",
        "extra_authorize": {},
    },
    "facebook": {
        "authorize_url": "https://www.facebook.com/v19.0/dialog/oauth",
        "token_url": "https://graph.facebook.com/v19.0/oauth/access_token",
        "scope": "pages_manage_posts,pages_read_engagement",
        "extra_authorize": {},
    },
    "instagram": {
        "authorize_url": "https://api.instagram.com/oauth/authorize",
        "token_url": "https://api.instagram.com/oauth/access_token",
        "scope": "user_profile,user_media",
        "extra_authorize": {},
    },
}


def _credentials(provider: str) -> tuple[str | None, str | None]:
    cid = getattr(settings, f"{provider}_client_id", None)
    secret = getattr(settings, f"{provider}_client_secret", None)
    return cid, secret


def _is_configured(provider: str) -> bool:
    cid, secret = _credentials(provider)
    return bool(cid and secret)


def _redirect_uri(provider: str) -> str:
    return f"{settings.public_api_url.rstrip('/')}{settings.api_prefix}/integrations/{provider}/callback"


@router.get("/me/social-connections", response_model=list[SocialConnectionOut])
def list_connections(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = {c.provider: c for c in db.query(SocialConnection).filter(SocialConnection.user_id == user.id).all()}

    def _status(conn):
        # A connection is only "live" if it actually holds an OAuth token.
        return "connected" if conn.access_token else "demo"

    return [
        SocialConnectionOut(
            provider=p,
            label=PROVIDER_LABELS.get(p, p),
            connected=p in rows,
            configured=_is_configured(p),
            external_username=rows[p].external_username if p in rows else None,
            status=_status(rows[p]) if p in rows else None,
        )
        for p in SOCIAL_PROVIDERS
    ]


@router.post("/me/social-connections/{provider}", response_model=SocialConnectionOut)
def demo_connect(
    provider: str,
    payload: SocialConnectRequest | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a DEMO connection (no real publishing). For live connections use the OAuth flow."""
    if provider not in SOCIAL_PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")
    conn = (
        db.query(SocialConnection)
        .filter(SocialConnection.user_id == user.id, SocialConnection.provider == provider)
        .first()
    )
    handle = (payload.external_username if payload else None) or (user.profile.username if user.profile else None)
    if not conn:
        conn = SocialConnection(
            tenant_id=user.tenant_id, user_id=user.id, provider=provider,
            external_username=handle, status="demo",
        )
        db.add(conn)
    else:
        if not conn.access_token:
            conn.status = "demo"
        if handle:
            conn.external_username = handle
    db.commit()
    return SocialConnectionOut(
        provider=provider, label=PROVIDER_LABELS.get(provider, provider), connected=True,
        configured=_is_configured(provider), external_username=conn.external_username, status=conn.status,
    )


@router.delete("/me/social-connections/{provider}")
def disconnect(provider: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if provider not in SOCIAL_PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")
    db.query(SocialConnection).filter(
        SocialConnection.user_id == user.id, SocialConnection.provider == provider
    ).delete()
    db.commit()
    return {"status": "disconnected", "provider": provider}


@router.get("/integrations/{provider}/authorize")
def authorize(provider: str, user: User = Depends(get_current_user)):
    """Return the provider's real OAuth consent URL (live connections only)."""
    if provider not in PROVIDER_OAUTH:
        raise HTTPException(status_code=404, detail="Unknown provider")
    if not _is_configured(provider):
        raise HTTPException(
            status_code=400,
            detail=f"{PROVIDER_LABELS.get(provider, provider)} is not configured. "
            f"Set {provider.upper()}_CLIENT_ID and {provider.upper()}_CLIENT_SECRET to enable live connect.",
        )
    cfg = PROVIDER_OAUTH[provider]
    cid, _ = _credentials(provider)
    # Signed, short-lived state carrying the user id (verified in the callback).
    state = create_token(f"{user.id}:{provider}", timedelta(minutes=10), "oauth_state")
    params = {
        "client_id": cid,
        "redirect_uri": _redirect_uri(provider),
        "response_type": "code",
        "scope": cfg["scope"],
        "state": state,
        **cfg.get("extra_authorize", {}),
    }
    return {"authorize_url": f"{cfg['authorize_url']}?{urllib.parse.urlencode(params)}"}


@router.get("/integrations/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str = Query(""),
    state: str = Query(""),
    error: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """OAuth redirect target: exchange the code for tokens and store the connection."""
    web = settings.web_url.rstrip("/")
    if provider not in PROVIDER_OAUTH or not _is_configured(provider):
        return RedirectResponse(f"{web}/feed?connect_error={provider}")

    payload = decode_token(state)
    if error or not code or not payload or payload.get("type") != "oauth_state":
        return RedirectResponse(f"{web}/feed?connect_error={provider}")
    subject = payload.get("sub", "")
    user_id = subject.split(":")[0] if subject else ""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(f"{web}/feed?connect_error={provider}")

    cfg = PROVIDER_OAUTH[provider]
    cid, secret = _credentials(provider)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                cfg["token_url"],
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": cid,
                    "client_secret": secret,
                    "redirect_uri": _redirect_uri(provider),
                },
                headers={"Accept": "application/json"},
            )
        token = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        access_token = token.get("access_token")
    except Exception:
        access_token = None

    if not access_token:
        return RedirectResponse(f"{web}/feed?connect_error={provider}")

    conn = (
        db.query(SocialConnection)
        .filter(SocialConnection.user_id == user.id, SocialConnection.provider == provider)
        .first()
    )
    if not conn:
        conn = SocialConnection(tenant_id=user.tenant_id, user_id=user.id, provider=provider)
        db.add(conn)
    conn.status = "connected"
    conn.access_token = access_token
    conn.refresh_token = token.get("refresh_token")
    conn.external_username = conn.external_username or (user.profile.username if user.profile else None)
    db.commit()

    username = user.profile.username if user.profile else ""
    return RedirectResponse(f"{web}/profile/{username}?connected={provider}")
