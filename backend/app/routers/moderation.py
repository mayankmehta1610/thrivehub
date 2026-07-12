from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import require_admin
from app.models import AiModerationFlag, Appeal, AuditLog, ModerationAction, Post, Report, User
from app.schemas import (
    AiFlagOut,
    AiFlagReview,
    AppealOut,
    AppealReview,
    AuditLogOut,
    AuthorBrief,
    ModerationActionCreate,
    ModerationActionOut,
    ReportOut,
    ReportResolve,
)
from app.utils.audit import log_audit
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(prefix="/admin/moderation", tags=["Admin Moderation"])


def _author_brief(user: User | None) -> AuthorBrief | None:
    if not user or not user.profile:
        return None
    return AuthorBrief(
        id=user.id,
        username=user.profile.username,
        display_name=user.profile.display_name,
        avatar_url=user.profile.avatar_url,
    )


@router.get("/reports", response_model=dict)
def list_reports(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query(None),
    sort_order: str = Query("desc"),
    search: str | None = Query(None),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order, search=search)
    query = db.query(Report).filter(Report.tenant_id == user.tenant_id)
    if status:
        query = query.filter(Report.status == status)
    items, total, total_pages = apply_pagination(
        query,
        params,
        default_sort="created_at",
        search_fields=[Report.target_type, Report.description],
        sort_map={"created_at": Report.created_at, "status": Report.status, "priority": Report.priority},
    )
    return paginated([ReportOut.model_validate(r) for r in items], total, params, total_pages)


@router.patch("/reports/{report_id}", response_model=ReportOut)
def resolve_report(
    report_id: str,
    payload: ReportResolve,
    request: Request,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    report = db.query(Report).filter(Report.id == report_id, Report.tenant_id == user.tenant_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = payload.status
    report.resolution_notes = payload.resolution_notes
    report.resolved_by = user.id
    report.resolved_at = datetime.now(timezone.utc)

    if payload.action:
        mod = ModerationAction(
            tenant_id=user.tenant_id,
            moderator_id=user.id,
            report_id=report_id,
            target_type=report.target_type,
            target_id=report.target_id,
            action=payload.action,
            reason=payload.resolution_notes,
        )
        db.add(mod)
        if payload.action == "hide" and report.target_type == "post":
            post = db.query(Post).filter(Post.id == report.target_id).first()
            if post:
                post.status = "hidden"

    log_audit(
        db,
        tenant_id=user.tenant_id,
        actor_id=user.id,
        action="report_resolved",
        entity_type="report",
        entity_id=report_id,
        details={"status": payload.status, "action": payload.action},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(report)
    return report


@router.get("/queue", response_model=dict)
def moderation_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size)
    query = db.query(Report).filter(Report.tenant_id == user.tenant_id, Report.status.in_(["open", "reviewing", "appealed"]))
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": Report.created_at}
    )
    return paginated([ReportOut.model_validate(r) for r in items], total, params, total_pages)


@router.post("/actions", response_model=ModerationActionOut, status_code=201)
def create_moderation_action(
    payload: ModerationActionCreate,
    request: Request,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    action = ModerationAction(
        tenant_id=user.tenant_id,
        moderator_id=user.id,
        report_id=payload.report_id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        action=payload.action,
        reason=payload.reason,
    )
    db.add(action)
    if payload.action == "hide" and payload.target_type == "post":
        post = db.query(Post).filter(Post.id == payload.target_id).first()
        if post:
            post.status = "hidden"
    log_audit(
        db,
        tenant_id=user.tenant_id,
        actor_id=user.id,
        action="moderation_action",
        entity_type=payload.target_type,
        entity_id=payload.target_id,
        details={"action": payload.action},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(action)
    return action


@router.get("/actions", response_model=dict)
def list_moderation_actions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size)
    query = db.query(ModerationAction).filter(ModerationAction.tenant_id == user.tenant_id)
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": ModerationAction.created_at}
    )
    return paginated([ModerationActionOut.model_validate(a) for a in items], total, params, total_pages)


@router.get("/appeals", response_model=dict)
def list_appeals(
    status: str | None = Query("pending"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size)
    query = db.query(Appeal).filter(Appeal.tenant_id == user.tenant_id)
    if status:
        query = query.filter(Appeal.status == status)
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": Appeal.created_at}
    )
    return paginated([AppealOut.model_validate(a) for a in items], total, params, total_pages)


@router.patch("/appeals/{appeal_id}", response_model=AppealOut)
def review_appeal(
    appeal_id: str,
    payload: AppealReview,
    request: Request,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id, Appeal.tenant_id == user.tenant_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    appeal.status = payload.status
    appeal.review_notes = payload.review_notes
    appeal.reviewer_id = user.id
    appeal.reviewed_at = datetime.now(timezone.utc)
    if payload.status == "approved" and appeal.moderation_action_id:
        mod = db.query(ModerationAction).filter(ModerationAction.id == appeal.moderation_action_id).first()
        if mod:
            mod.status = "reversed"
            if mod.target_type == "post":
                post = db.query(Post).filter(Post.id == mod.target_id).first()
                if post:
                    post.status = "published"
    log_audit(
        db,
        tenant_id=user.tenant_id,
        actor_id=user.id,
        action="appeal_reviewed",
        entity_type="appeal",
        entity_id=appeal_id,
        details={"status": payload.status},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(appeal)
    return appeal


@router.get("/ai-flags", response_model=dict)
def list_ai_flags(
    status: str | None = Query("pending"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size)
    query = db.query(AiModerationFlag).filter(AiModerationFlag.tenant_id == user.tenant_id)
    if status:
        query = query.filter(AiModerationFlag.status == status)
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": AiModerationFlag.created_at}
    )
    return paginated([AiFlagOut.model_validate(f) for f in items], total, params, total_pages)


@router.patch("/ai-flags/{flag_id}", response_model=AiFlagOut)
def review_ai_flag(
    flag_id: str,
    payload: AiFlagReview,
    request: Request,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    flag = db.query(AiModerationFlag).filter(AiModerationFlag.id == flag_id, AiModerationFlag.tenant_id == user.tenant_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    flag.status = payload.status
    flag.review_notes = payload.review_notes
    flag.reviewer_id = user.id
    flag.reviewed_at = datetime.now(timezone.utc)
    if payload.status == "reviewed" and flag.target_type == "post":
        post = db.query(Post).filter(Post.id == flag.target_id).first()
        if post:
            post.status = "hidden"
    log_audit(
        db,
        tenant_id=user.tenant_id,
        actor_id=user.id,
        action="ai_flag_reviewed",
        entity_type="ai_flag",
        entity_id=flag_id,
        details={"status": payload.status},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(flag)
    return flag


@router.get("/audit-logs", response_model=dict)
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query(None),
    sort_order: str = Query("desc"),
    search: str | None = Query(None),
    action: str | None = Query(None),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order, search=search)
    query = (
        db.query(AuditLog)
        .filter(AuditLog.tenant_id == user.tenant_id)
        .options(joinedload(AuditLog.actor).joinedload(User.profile))
    )
    if action:
        query = query.filter(AuditLog.action == action)
    items, total, total_pages = apply_pagination(
        query,
        params,
        default_sort="created_at",
        search_fields=[AuditLog.action, AuditLog.entity_type, AuditLog.details_json],
        sort_map={"created_at": AuditLog.created_at, "action": AuditLog.action},
    )
    out = [
        AuditLogOut(
            id=log.id,
            actor_id=log.actor_id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details_json=log.details_json,
            ip_address=log.ip_address,
            created_at=log.created_at,
            actor=_author_brief(log.actor),
        )
        for log in items
    ]
    return paginated(out, total, params, total_pages)
