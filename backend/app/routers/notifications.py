from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Notification, User
from app.schemas import NotificationOut
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=dict)
def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size)
    query = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        query = query.filter(Notification.read_at.is_(None))
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": Notification.created_at}
    )
    return paginated([NotificationOut.model_validate(n) for n in items], total, params, total_pages)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if notification and not notification.read_at:
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
    return notification


@router.post("/read-all")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.read_at.is_(None)).update(
        {"read_at": datetime.now(timezone.utc)}
    )
    db.commit()
    return {"status": "ok"}
