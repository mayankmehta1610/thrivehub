from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import require_admin
from app.models import MasterValue, User
from app.routers.platform import _master_out
from app.schemas import UserOut
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(tags=["Admin"])


@router.get("/users", response_model=dict)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query(None),
    sort_order: str = Query("desc"),
    search: str | None = Query(None),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order, search=search)
    query = db.query(User).options(joinedload(User.profile)).filter(User.tenant_id == user.tenant_id)
    items, total, total_pages = apply_pagination(
        query,
        params,
        default_sort="created_at",
        search_fields=[User.email],
        sort_map={"created_at": User.created_at, "email": User.email},
    )
    return paginated([UserOut.model_validate(u) for u in items], total, params, total_pages)


@router.get("/masters", response_model=dict)
def list_public_masters(
    master_type: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size, search=search)
    query = db.query(MasterValue).filter(MasterValue.master_type == master_type, MasterValue.status == "active")
    items, total, total_pages = apply_pagination(
        query,
        params,
        default_sort="sort_order",
        search_fields=[MasterValue.code, MasterValue.label],
        sort_map={"sort_order": MasterValue.sort_order, "label": MasterValue.label},
    )
    return paginated([_master_out(m) for m in items], total, params, total_pages)
