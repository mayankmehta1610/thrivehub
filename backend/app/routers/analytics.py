"""Platform analytics — aggregate metrics for the admin dashboard."""
from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import (
    Comment,
    Community,
    CommunityMember,
    Event,
    EventParticipant,
    Message,
    Post,
    Reaction,
    Report,
    User,
    UserSubscription,
    utcnow,
)

router = APIRouter(prefix="/admin/analytics", tags=["Analytics"])


@router.get("")
def analytics_overview(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    def count(model, *filters):
        q = db.query(func.count(model.id))
        for f in filters:
            q = q.filter(f)
        return q.scalar() or 0

    week_ago = utcnow() - timedelta(days=7)

    totals = {
        "users": count(User),
        "posts": count(Post),
        "comments": count(Comment),
        "reactions": count(Reaction),
        "communities": count(Community),
        "events": count(Event),
        "event_registrations": count(EventParticipant),
        "community_members": count(CommunityMember),
        "messages": count(Message),
        "reports_open": count(Report, Report.status == "open"),
        "subscriptions_active": count(UserSubscription, UserSubscription.status == "active"),
    }

    new_7d = {
        "users": count(User, User.created_at >= week_ago),
        "posts": count(Post, Post.created_at >= week_ago),
        "comments": count(Comment, Comment.created_at >= week_ago),
        "events": count(Event, Event.created_at >= week_ago),
    }

    # Engagement per post (reactions + comments)
    total_engagement = totals["reactions"] + totals["comments"]
    engagement_per_post = round(total_engagement / totals["posts"], 2) if totals["posts"] else 0

    top_communities = [
        {"name": name, "members": members}
        for name, members in (
            db.query(Community.name, func.count(CommunityMember.id))
            .outerjoin(CommunityMember, CommunityMember.community_id == Community.id)
            .group_by(Community.id)
            .order_by(func.count(CommunityMember.id).desc())
            .limit(5)
            .all()
        )
    ]

    top_events = [
        {"title": title, "registrations": regs}
        for title, regs in (
            db.query(Event.title, func.count(EventParticipant.id))
            .outerjoin(EventParticipant, EventParticipant.event_id == Event.id)
            .group_by(Event.id)
            .order_by(func.count(EventParticipant.id).desc())
            .limit(5)
            .all()
        )
    ]

    return {
        "totals": totals,
        "new_last_7_days": new_7d,
        "engagement_per_post": engagement_per_post,
        "top_communities": top_communities,
        "top_events": top_events,
    }
