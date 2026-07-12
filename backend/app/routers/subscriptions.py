import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_optional_user
from app.models import Sponsorship, SubscriptionTier, User, UserSubscription
from app.schemas import SponsorshipOut, SubscriptionTierOut
from app.utils.cache import cache_get, cache_set
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(tags=["Commercial"])


@router.get("/subscriptions/tiers", response_model=dict)
def list_subscription_tiers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    cache_key = f"tiers:{page}:{page_size}:{search}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    params = PaginationParams(page=page, page_size=page_size, search=search)
    query = db.query(SubscriptionTier).filter(SubscriptionTier.status == "active")
    items, total, total_pages = apply_pagination(
        query,
        params,
        default_sort="sort_order",
        search_fields=[SubscriptionTier.name, SubscriptionTier.code, SubscriptionTier.description],
        sort_map={"sort_order": SubscriptionTier.sort_order, "name": SubscriptionTier.name},
    )
    result = paginated([SubscriptionTierOut.model_validate(t) for t in items], total, params, total_pages)
    cache_set(cache_key, result.model_dump())
    return result


@router.get("/subscriptions/me")
def my_subscription(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = (
        db.query(UserSubscription)
        .filter(UserSubscription.user_id == user.id, UserSubscription.status == "active")
        .order_by(UserSubscription.started_at.desc())
        .first()
    )
    if not sub:
        return {"tier": None, "status": "free"}
    tier = db.query(SubscriptionTier).filter(SubscriptionTier.id == sub.tier_id).first()
    return {
        "tier": SubscriptionTierOut.model_validate(tier) if tier else None,
        "status": sub.status,
        "started_at": sub.started_at,
        "expires_at": sub.expires_at,
    }


@router.get("/sponsorships", response_model=dict)
def list_sponsorships(
    placement: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    cache_key = f"sponsors:{placement}:{page}:{page_size}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    params = PaginationParams(page=page, page_size=page_size)
    query = db.query(Sponsorship).filter(Sponsorship.status == "active")
    if placement:
        query = query.filter(Sponsorship.placement == placement)
    items, total, total_pages = apply_pagination(
        query,
        params,
        default_sort="sort_order",
        sort_map={"sort_order": Sponsorship.sort_order, "created_at": Sponsorship.created_at},
    )
    result = paginated([SponsorshipOut.model_validate(s) for s in items], total, params, total_pages)
    cache_set(cache_key, result.model_dump())
    return result
