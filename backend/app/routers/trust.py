from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Appeal, ModerationAction, Report, User, UserBlock, UserMute
from app.schemas import AppealCreate, AppealOut, AppealReview, ModerationActionCreate, ModerationActionOut, ReportOut, ReportResolve
from app.utils.audit import log_audit
from app.utils.pagination import PaginationParams, apply_pagination, paginated
from app.utils.trust import is_blocked

router = APIRouter(prefix="/trust", tags=["Trust & Safety"])


@router.post("/reports/{report_id}/appeals", response_model=AppealOut, status_code=201)
def create_appeal(
    report_id: str,
    payload: AppealCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = db.query(Report).filter(Report.id == report_id, Report.tenant_id == user.tenant_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    appeal = Appeal(
        tenant_id=user.tenant_id,
        appellant_id=user.id,
        report_id=report_id,
        moderation_action_id=payload.moderation_action_id,
        reason=payload.reason,
    )
    db.add(appeal)
    report.status = "appealed"
    db.commit()
    db.refresh(appeal)
    return appeal


@router.get("/appeals", response_model=dict)
def list_my_appeals(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size)
    query = db.query(Appeal).filter(Appeal.appellant_id == user.id)
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": Appeal.created_at}
    )
    return paginated([AppealOut.model_validate(a) for a in items], total, params, total_pages)


@router.post("/users/{user_id}/block", status_code=201)
def block_user(user_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(UserBlock).filter(UserBlock.blocker_id == user.id, UserBlock.blocked_id == user_id).first()
    if existing:
        return {"status": "already_blocked"}
    db.add(UserBlock(blocker_id=user.id, blocked_id=user_id))
    db.commit()
    return {"status": "blocked"}


@router.delete("/users/{user_id}/block", status_code=204)
def unblock_user(user_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    block = db.query(UserBlock).filter(UserBlock.blocker_id == user.id, UserBlock.blocked_id == user_id).first()
    if block:
        db.delete(block)
        db.commit()


@router.get("/blocks", response_model=dict)
def list_blocks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.routers.posts import _author_brief

    params = PaginationParams(page=page, page_size=page_size)
    query = (
        db.query(UserBlock)
        .filter(UserBlock.blocker_id == user.id)
        .options(joinedload(UserBlock.blocked).joinedload(User.profile))
    )
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": UserBlock.created_at}
    )
    out = [{"id": b.id, "user": _author_brief(b.blocked), "created_at": b.created_at} for b in items]
    return paginated(out, total, params, total_pages)


@router.post("/users/{user_id}/mute", status_code=201)
def mute_user(user_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot mute yourself")
    existing = db.query(UserMute).filter(UserMute.muter_id == user.id, UserMute.muted_id == user_id).first()
    if existing:
        return {"status": "already_muted"}
    db.add(UserMute(muter_id=user.id, muted_id=user_id))
    db.commit()
    return {"status": "muted"}


@router.delete("/users/{user_id}/mute", status_code=204)
def unmute_user(user_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mute = db.query(UserMute).filter(UserMute.muter_id == user.id, UserMute.muted_id == user_id).first()
    if mute:
        db.delete(mute)
        db.commit()


@router.get("/mutes", response_model=dict)
def list_mutes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.routers.posts import _author_brief

    params = PaginationParams(page=page, page_size=page_size)
    query = (
        db.query(UserMute)
        .filter(UserMute.muter_id == user.id)
        .options(joinedload(UserMute.muted).joinedload(User.profile))
    )
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": UserMute.created_at}
    )
    out = [{"id": m.id, "user": _author_brief(m.muted), "created_at": m.created_at} for m in items]
    return paginated(out, total, params, total_pages)
