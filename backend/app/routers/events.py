from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import Event, EventParticipant, User
from app.routers.posts import _author_brief
from app.schemas import EventCreate, EventOut
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(prefix="/events", tags=["Events"])


def _event_out(event: Event, db: Session) -> EventOut:
    participant_count = db.query(func.count(EventParticipant.id)).filter(EventParticipant.event_id == event.id).scalar() or 0
    return EventOut(
        id=event.id,
        title=event.title,
        description=event.description,
        venue=event.venue,
        image_url=event.image_url,
        start_at=event.start_at,
        end_at=event.end_at,
        capacity=event.capacity,
        status=event.status,
        participant_count=participant_count,
        organiser=_author_brief(event.organiser),
    )


@router.get("", response_model=dict)
def list_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query(None),
    sort_order: str = Query("asc"),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order, search=search)
    query = db.query(Event).options(joinedload(Event.organiser).joinedload(User.profile))
    items, total, total_pages = apply_pagination(
        query,
        params,
        default_sort="start_at",
        search_fields=[Event.title, Event.description, Event.venue],
        sort_map={"start_at": Event.start_at, "title": Event.title, "created_at": Event.created_at},
    )
    return paginated([_event_out(e, db) for e in items], total, params, total_pages)


@router.post("", response_model=EventOut, status_code=201)
def create_event(payload: EventCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = Event(
        tenant_id=user.tenant_id,
        organiser_id=user.id,
        title=payload.title,
        description=payload.description,
        venue=payload.venue,
        image_url=payload.image_url or "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1200",
        start_at=payload.start_at,
        end_at=payload.end_at,
        capacity=payload.capacity,
        event_type_id=payload.event_type_id,
        community_id=payload.community_id,
    )
    db.add(event)
    db.commit()
    event = db.query(Event).options(joinedload(Event.organiser).joinedload(User.profile)).filter(Event.id == event.id).first()
    return _event_out(event, db)


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).options(joinedload(Event.organiser).joinedload(User.profile)).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_out(event, db)


@router.post("/{event_id}/register", status_code=201)
def register_event(event_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.capacity:
        count = db.query(func.count(EventParticipant.id)).filter(EventParticipant.event_id == event_id).scalar() or 0
        if count >= event.capacity:
            raise HTTPException(status_code=400, detail="Event is full")
    existing = db.query(EventParticipant).filter(EventParticipant.event_id == event_id, EventParticipant.user_id == user.id).first()
    if existing:
        return {"status": "already_registered"}
    db.add(EventParticipant(event_id=event_id, user_id=user.id))
    db.commit()
    return {"status": "registered"}
