"""Connection requests — mutual connections (request/accept), distinct from one-way follow."""
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import Connection, Notification, NotificationType, Profile, User
from app.routers.posts import _author_brief
from app.schemas import ConnectionRequestOut, ConnectionStatusOut
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(prefix="/connections", tags=["Connections"])


def _target(db: Session, username: str) -> User:
    profile = db.query(Profile).filter(Profile.username == username).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    user = db.query(User).options(joinedload(User.profile)).filter(User.id == profile.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _between(db: Session, a: str, b: str) -> Connection | None:
    return (
        db.query(Connection)
        .filter(
            or_(
                (Connection.requester_id == a) & (Connection.addressee_id == b),
                (Connection.requester_id == b) & (Connection.addressee_id == a),
            )
        )
        .first()
    )


def _count(db: Session, user_id: str) -> int:
    return db.query(func.count(Connection.id)).filter(
        Connection.status == "accepted",
        or_(Connection.requester_id == user_id, Connection.addressee_id == user_id),
    ).scalar() or 0


@router.get("/status/{username}", response_model=ConnectionStatusOut)
def connection_status(username: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = _target(db, username)
    count = _count(db, target.id)
    if target.id == user.id:
        return ConnectionStatusOut(status="self", connection_count=count)
    conn = _between(db, user.id, target.id)
    if not conn:
        status = "none"
    elif conn.status == "accepted":
        status = "connected"
    elif conn.requester_id == user.id:
        status = "pending_outgoing"
    else:
        status = "pending_incoming"
    return ConnectionStatusOut(status=status, connection_count=count)


@router.post("/request/{username}", status_code=201)
def send_request(username: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = _target(db, username)
    if target.id == user.id:
        raise HTTPException(status_code=400, detail="You can't connect with yourself")
    conn = _between(db, user.id, target.id)
    if conn:
        if conn.status == "accepted":
            return {"status": "connected"}
        # An incoming request already exists → accepting completes the connection.
        if conn.addressee_id == user.id:
            conn.status = "accepted"
            db.commit()
            return {"status": "connected"}
        return {"status": "pending_outgoing"}
    db.add(Connection(tenant_id=user.tenant_id, requester_id=user.id, addressee_id=target.id, status="pending"))
    sender = user.profile.display_name if user.profile else "Someone"
    sender_username = user.profile.username if user.profile else ""
    db.add(Notification(
        tenant_id=user.tenant_id, user_id=target.id, type=NotificationType.follow,
        title="New connection request", body=f"{sender} wants to connect with you",
        payload_json=json.dumps({"link": f"/profile/{sender_username}"}),
    ))
    db.commit()
    return {"status": "pending_outgoing"}


@router.get("/requests", response_model=list[ConnectionRequestOut])
def incoming_requests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Connection)
        .options(joinedload(Connection.requester).joinedload(User.profile))
        .filter(Connection.addressee_id == user.id, Connection.status == "pending")
        .order_by(Connection.created_at.desc())
        .all()
    )
    return [ConnectionRequestOut(user=_author_brief(c.requester), created_at=c.created_at) for c in rows]


@router.post("/accept/{user_id}")
def accept_request(user_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conn = (
        db.query(Connection)
        .filter(Connection.requester_id == user_id, Connection.addressee_id == user.id, Connection.status == "pending")
        .first()
    )
    if not conn:
        raise HTTPException(status_code=404, detail="No pending request from this user")
    conn.status = "accepted"
    accepter = user.profile.display_name if user.profile else "Someone"
    accepter_username = user.profile.username if user.profile else ""
    db.add(Notification(
        tenant_id=user.tenant_id, user_id=user_id, type=NotificationType.follow,
        title="Connection accepted", body=f"{accepter} accepted your connection request",
        payload_json=json.dumps({"link": f"/profile/{accepter_username}"}),
    ))
    db.commit()
    return {"status": "connected"}


@router.delete("/{user_id}")
def remove_connection(user_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Cancel an outgoing request, decline an incoming one, or remove an existing connection."""
    conn = _between(db, user.id, user_id)
    if conn:
        db.delete(conn)
        db.commit()
    return {"status": "removed"}


@router.get("", response_model=dict)
def my_connections(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size)
    query = (
        db.query(Connection)
        .options(
            joinedload(Connection.requester).joinedload(User.profile),
            joinedload(Connection.addressee).joinedload(User.profile),
        )
        .filter(
            Connection.status == "accepted",
            or_(Connection.requester_id == user.id, Connection.addressee_id == user.id),
        )
    )
    items, total, total_pages = apply_pagination(query, params, default_sort="created_at", sort_map={"created_at": Connection.created_at})
    out = []
    for c in items:
        other = c.addressee if c.requester_id == user.id else c.requester
        out.append(_author_brief(other))
    return paginated([o for o in out if o], total, params, total_pages)
