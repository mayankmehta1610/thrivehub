import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Community, CommunityMember, Event, EventParticipant, MasterValue, MembershipStatus, Post, Profile, Report, Sponsorship, User
from app.schemas import (
    FeaturedCommunityItem,
    FeaturedEventItem,
    FeaturedPostItem,
    MasterValueCreate,
    MasterValueOut,
    PlatformConfigOut,
    ReportCreate,
    SearchResult,
    SkillCategoryItem,
    SponsorshipBrief,
    UploadLimits,
)
from app.utils.upload_limits import get_upload_limits
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(tags=["Platform"])

DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&q=80&auto=format&fit=crop"


def _valid_image_url(url: str | None) -> str | None:
    if not url or not str(url).strip():
        return None
    return url


def _meta_image(m: MasterValue) -> str | None:
    if not m.metadata_json:
        return None
    try:
        return json.loads(m.metadata_json).get("image_url")
    except (json.JSONDecodeError, TypeError):
        return None


def _master_out(m: MasterValue) -> MasterValueOut:
    out = MasterValueOut.model_validate(m)
    out.image_url = _meta_image(m)
    return out


@router.get("/search", response_model=dict)
def search(
    q: str = Query(..., min_length=1),
    entity: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size, search=q)
    results: list[SearchResult] = []
    term = f"%{q}%"

    if entity in (None, "profiles"):
        for p in db.query(Profile).filter(Profile.username.ilike(term) | Profile.display_name.ilike(term)).limit(10):
            results.append(SearchResult(entity_type="profile", id=p.user_id, title=p.display_name, subtitle=f"@{p.username}", image_url=p.avatar_url))
    if entity in (None, "communities"):
        for c in db.query(Community).filter(Community.name.ilike(term)).limit(10):
            results.append(SearchResult(entity_type="community", id=c.id, title=c.name, subtitle=c.slug, image_url=c.cover_url))
    if entity in (None, "events"):
        for e in db.query(Event).filter(Event.title.ilike(term)).limit(10):
            results.append(SearchResult(entity_type="event", id=e.id, title=e.title, subtitle=e.venue, image_url=e.image_url))
    if entity in (None, "posts"):
        for p in db.query(Post).filter(Post.body.ilike(term)).limit(10):
            results.append(SearchResult(entity_type="post", id=p.id, title=p.body[:80], subtitle=None, image_url=p.image_url))

    start = params.offset
    end = start + params.page_size
    page_items = results[start:end]
    total = len(results)
    total_pages = max(1, (total + params.page_size - 1) // params.page_size)
    return paginated(page_items, total, params, total_pages)


@router.get("/config", response_model=PlatformConfigOut)
def platform_config(db: Session = Depends(get_db)):
    masters = (
        db.query(MasterValue)
        .filter(MasterValue.master_type == "platform_config", MasterValue.status == "active")
        .order_by(MasterValue.sort_order)
        .all()
    )
    config = {m.code: m.label for m in masters}
    features = (
        db.query(MasterValue)
        .filter(MasterValue.master_type == "feature", MasterValue.status == "active")
        .order_by(MasterValue.sort_order)
        .all()
    )
    skill_cats = (
        db.query(MasterValue)
        .filter(MasterValue.master_type == "skill_category", MasterValue.status == "active")
        .order_by(MasterValue.sort_order)
        .all()
    )
    skill_categories = [
        SkillCategoryItem(code=c.code, label=c.label, description=c.description, image_url=_valid_image_url(_meta_image(c)))
        for c in skill_cats
    ]

    communities_q = (
        db.query(Community)
        .filter(Community.status == "active")
        .order_by(Community.created_at.desc())
        .limit(6)
    )
    featured_communities = []
    for c in communities_q:
        member_count = db.query(func.count(CommunityMember.id)).filter(
            CommunityMember.community_id == c.id,
            CommunityMember.status == MembershipStatus.active,
        ).scalar() or 0
        featured_communities.append(FeaturedCommunityItem(
            id=c.id, name=c.name, slug=c.slug, description=c.description,
            cover_url=_valid_image_url(c.cover_url), member_count=member_count,
        ))

    events_q = (
        db.query(Event)
        .order_by(Event.start_at.asc())
        .limit(6)
    )
    featured_events = []
    for e in events_q:
        participant_count = db.query(func.count(EventParticipant.id)).filter(
            EventParticipant.event_id == e.id,
        ).scalar() or 0
        featured_events.append(FeaturedEventItem(
            id=e.id, title=e.title, description=e.description, venue=e.venue,
            image_url=_valid_image_url(e.image_url), start_at=e.start_at, participant_count=participant_count,
        ))

    posts_q = (
        db.query(Post)
        .options(joinedload(Post.author).joinedload(User.profile))
        .filter(Post.status == "published", Post.image_url.isnot(None), Post.image_url != "")
        .order_by(Post.created_at.desc())
        .limit(6)
    )
    featured_posts = []
    for p in posts_q:
        profile = p.author.profile if p.author else None
        featured_posts.append(FeaturedPostItem(
            id=p.id, body=p.body[:120], image_url=_valid_image_url(p.image_url),
            author_name=profile.display_name if profile else None,
            author_avatar=_valid_image_url(profile.avatar_url) if profile else None,
        ))

    sponsors = (
        db.query(Sponsorship)
        .filter(Sponsorship.status == "active", Sponsorship.placement == "landing_banner")
        .order_by(Sponsorship.sort_order)
        .limit(4)
        .all()
    )
    sponsorships = [
        SponsorshipBrief(
            id=s.id, title=s.title, sponsor_name=s.sponsor_name,
            image_url=_valid_image_url(s.image_url), link_url=s.link_url, placement=s.placement,
        )
        for s in sponsors
        if _valid_image_url(s.image_url)
    ]

    user_count = db.query(func.count(User.id)).scalar() or 0
    community_count = db.query(func.count(Community.id)).filter(Community.status == "active").scalar() or 0
    event_count = db.query(func.count(Event.id)).scalar() or 0

    limits = get_upload_limits(db)

    return PlatformConfigOut(
        app_name=config.get("app_name", "ThriveHub"),
        tagline=config.get("tagline", "Skills, Sports & Adventure Community"),
        hero_image=_valid_image_url(config.get("hero_image")) or DEFAULT_HERO_IMAGE,
        hero_subtitle=config.get("hero_subtitle"),
        primary_color=config.get("primary_color", "#6366F1"),
        secondary_color=config.get("secondary_color", "#8B5CF6"),
        accent_color=config.get("accent_color", "#F43F5E"),
        features=[{"code": f.code, "label": f.label, "description": f.description} for f in features],
        skill_categories=skill_categories,
        featured_communities=featured_communities,
        featured_events=featured_events,
        featured_posts=featured_posts,
        sponsorships=sponsorships,
        stats={
            "members": user_count,
            "communities": community_count,
            "events": event_count,
            "skill_categories": len(skill_categories),
        },
        upload_limits=UploadLimits(**limits),
    )


@router.get("/admin/masters", response_model=dict)
def list_masters(
    master_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size, search=search)
    query = db.query(MasterValue).filter(MasterValue.tenant_id == user.tenant_id)
    if master_type:
        query = query.filter(MasterValue.master_type == master_type)
    items, total, total_pages = apply_pagination(
        query,
        params,
        default_sort="sort_order",
        search_fields=[MasterValue.code, MasterValue.label, MasterValue.description],
        sort_map={"sort_order": MasterValue.sort_order, "label": MasterValue.label, "created_at": MasterValue.created_at},
    )
    return paginated([_master_out(m) for m in items], total, params, total_pages)


@router.post("/admin/masters", response_model=MasterValueOut, status_code=201)
def create_master(payload: MasterValueCreate, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    master = MasterValue(
        tenant_id=user.tenant_id,
        master_type=payload.master_type,
        code=payload.code,
        label=payload.label,
        description=payload.description,
        sort_order=payload.sort_order,
    )
    db.add(master)
    db.commit()
    db.refresh(master)
    return _master_out(master)


@router.post("/reports", status_code=201)
def create_report(payload: ReportCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    report = Report(
        tenant_id=user.tenant_id,
        reporter_id=user.id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason_id=payload.reason_id,
        description=payload.description,
    )
    db.add(report)
    db.commit()
    return {"status": "submitted", "id": report.id}
