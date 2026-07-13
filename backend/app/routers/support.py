"""Support — user feedback / surveys and a help centre feed."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Feedback, User
from app.routers.posts import _author_brief
from app.schemas import FeedbackCreate, FeedbackOut
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(tags=["Support"])

HELP_ARTICLES = [
    {"q": "How do I create a post?", "a": "Open the Feed and use the composer at the top. Add text and optionally a photo, video or audio file with the Photo / Video / Audio button, then Post."},
    {"q": "How do I post in a community?", "a": "Join the community, then use the composer on the community page. The creator and any co-admins can post too."},
    {"q": "How do I make someone a co-admin?", "a": "On a community you admin, open the members list and choose Make co-admin next to a member."},
    {"q": "How do I register for an event?", "a": "Open Events, click an event, and press Register. Events you've joined show a Registered badge."},
    {"q": "How do I message someone?", "a": "Open a profile and click the message icon, or use New in Messages to search for a person."},
    {"q": "How do I connect a social channel?", "a": "Profile → Edit → Connected Accounts. Live connect uses the platform's real sign-in when its API keys are configured; otherwise you can add a demo connection."},
    {"q": "What are the upload limits?", "a": "Images up to 500 KB, video up to 2 MB, audio up to 5 MB by default (configurable by admins)."},
]


@router.get("/support/help")
def help_centre():
    return {"articles": HELP_ARTICLES}


@router.post("/support/feedback", status_code=201)
def submit_feedback(payload: FeedbackCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fb = Feedback(
        tenant_id=user.tenant_id,
        user_id=user.id,
        category=payload.category,
        message=payload.message,
        rating=payload.rating,
    )
    db.add(fb)
    db.commit()
    return {"status": "received", "id": fb.id}


@router.get("/admin/feedback", response_model=dict)
def list_feedback(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size)
    query = (
        db.query(Feedback)
        .filter(Feedback.tenant_id == user.tenant_id)
        .options(joinedload(Feedback.user).joinedload(User.profile))
    )
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": Feedback.created_at}
    )
    out = [
        FeedbackOut(
            id=f.id, category=f.category, message=f.message, rating=f.rating,
            status=f.status, created_at=f.created_at, user=_author_brief(f.user) if f.user else None,
        )
        for f in items
    ]
    return paginated(out, total, params, total_pages)
