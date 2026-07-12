from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import MasterValue, Report, User
from app.schemas import MasterValueCreate, MasterValueOut, PlatformConfigOut, ReportCreate, SearchResult
from app.utils.pagination import PaginationParams, apply_pagination, paginated
from app.models import Community, Event, Post, Profile

router = APIRouter(tags=["Platform"])


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
    return PlatformConfigOut(
        app_name=config.get("app_name", "ThriveHub"),
        tagline=config.get("tagline", "Skills, Sports & Adventure Community"),
        hero_image=config.get("hero_image", "https://images.unsplash.com/photo-1517649763962-0c62306601b7?w=1600"),
        primary_color=config.get("primary_color", "#6366F1"),
        secondary_color=config.get("secondary_color", "#EC4899"),
        accent_color=config.get("accent_color", "#14B8A6"),
        features=[{"code": f.code, "label": f.label, "description": f.description} for f in features],
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
    return paginated([MasterValueOut.model_validate(m) for m in items], total, params, total_pages)


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
    return master


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
