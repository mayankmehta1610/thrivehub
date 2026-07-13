"""Data privacy — self-service data export and account deletion request (GDPR-style)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    Comment,
    Community,
    CommunityMember,
    EventParticipant,
    Feedback,
    Message,
    Post,
    SocialConnection,
    User,
)

router = APIRouter(prefix="/me", tags=["Privacy"])


@router.get("/export")
def export_my_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return a full copy of the signed-in user's data as JSON (downloadable)."""
    profile = user.profile
    posts = db.query(Post).filter(Post.author_id == user.id).all()
    comments = db.query(Comment).filter(Comment.author_id == user.id).all()
    memberships = (
        db.query(Community.name, Community.slug, CommunityMember.role)
        .join(CommunityMember, CommunityMember.community_id == Community.id)
        .filter(CommunityMember.user_id == user.id)
        .all()
    )
    event_regs = (
        db.query(EventParticipant.event_id).filter(EventParticipant.user_id == user.id).all()
    )
    messages_sent = db.query(func.count(Message.id)).filter(Message.sender_id == user.id).scalar() or 0
    connections = db.query(SocialConnection).filter(SocialConnection.user_id == user.id).all()

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "account": {"id": user.id, "email": user.email, "role": user.role, "created_at": user.created_at.isoformat()},
        "profile": {
            "username": profile.username if profile else None,
            "display_name": profile.display_name if profile else None,
            "bio": profile.bio if profile else None,
            "location": profile.location if profile else None,
            "website": profile.website if profile else None,
            "avatar_url": profile.avatar_url if profile else None,
        } if profile else None,
        "posts": [{"id": p.id, "body": p.body, "image_url": p.image_url, "created_at": p.created_at.isoformat()} for p in posts],
        "comments": [{"id": c.id, "post_id": c.post_id, "body": c.body, "created_at": c.created_at.isoformat()} for c in comments],
        "communities": [{"name": n, "slug": s, "role": (r.value if hasattr(r, "value") else r)} for n, s, r in memberships],
        "events_registered": [e[0] for e in event_regs],
        "messages_sent": messages_sent,
        "connected_accounts": [{"provider": c.provider, "status": c.status, "username": c.external_username} for c in connections],
    }


@router.post("/deletion-request", status_code=201)
def request_account_deletion(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Record a request to delete the account. Processed by an admin (reversible grace period)."""
    existing = (
        db.query(Feedback)
        .filter(Feedback.user_id == user.id, Feedback.category == "account_deletion", Feedback.status == "new")
        .first()
    )
    if existing:
        return {"status": "already_requested"}
    fb = Feedback(
        tenant_id=user.tenant_id,
        user_id=user.id,
        category="account_deletion",
        message="User requested account deletion.",
    )
    db.add(fb)
    db.commit()
    return {"status": "requested"}
