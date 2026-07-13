"""Explore — a ranked discovery surface (trending posts, popular communities, upcoming events, people)."""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_optional_user
from app.models import (
    Community,
    CommunityMember,
    Event,
    EventParticipant,
    MembershipStatus,
    Post,
    Profile,
    User,
    utcnow,
)
from app.routers.posts import _post_out

router = APIRouter(prefix="/explore", tags=["Discovery"])


@router.get("")
def explore(db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    # Trending posts — recent published posts ranked by engagement.
    recent = (
        db.query(Post)
        .options(joinedload(Post.author).joinedload(User.profile))
        .filter(Post.status == "published")
        .order_by(Post.created_at.desc())
        .limit(40)
        .all()
    )
    posts_out = [_post_out(p, user, db) for p in recent]
    posts_out.sort(key=lambda p: (p.reaction_count + p.comment_count + p.share_count), reverse=True)
    trending_posts = posts_out[:6]

    # Popular communities — by active member count.
    comm_rows = (
        db.query(Community, func.count(CommunityMember.id))
        .outerjoin(
            CommunityMember,
            (CommunityMember.community_id == Community.id) & (CommunityMember.status == MembershipStatus.active),
        )
        .filter(Community.status == "active")
        .group_by(Community.id)
        .order_by(func.count(CommunityMember.id).desc())
        .limit(6)
        .all()
    )
    popular_communities = [
        {"id": c.id, "name": c.name, "slug": c.slug, "description": c.description,
         "cover_url": c.cover_url, "member_count": cnt}
        for c, cnt in comm_rows
    ]

    # Upcoming events — soonest first (future first, then any).
    events = db.query(Event).filter(Event.start_at >= utcnow()).order_by(Event.start_at.asc()).limit(6).all()
    if not events:
        events = db.query(Event).order_by(Event.start_at.asc()).limit(6).all()
    upcoming_events = []
    for e in events:
        count = db.query(func.count(EventParticipant.id)).filter(EventParticipant.event_id == e.id).scalar() or 0
        upcoming_events.append({
            "id": e.id, "title": e.title, "venue": e.venue, "image_url": e.image_url,
            "start_at": e.start_at, "participant_count": count,
        })

    # People to discover — profiles excluding the current user.
    pq = db.query(Profile)
    if user:
        pq = pq.filter(Profile.user_id != user.id)
    profiles = pq.order_by(Profile.created_at.desc()).limit(8).all()
    suggested_people = [
        {"id": p.user_id, "username": p.username, "display_name": p.display_name, "avatar_url": p.avatar_url}
        for p in profiles
    ]

    return {
        "trending_posts": trending_posts,
        "popular_communities": popular_communities,
        "upcoming_events": upcoming_events,
        "suggested_people": suggested_people,
    }
