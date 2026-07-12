import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import AiModerationFlag, Post, User
from app.schemas import AiFlagCreate, AiFlagOut

router = APIRouter(prefix="/ai", tags=["AI Moderation"])


@router.post("/flag", response_model=AiFlagOut, status_code=201)
def flag_content(payload: AiFlagCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Hook endpoint for AI moderation services to flag content for admin review."""
    if payload.target_type == "post":
        post = db.query(Post).filter(Post.id == payload.target_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Target not found")

    flag = AiModerationFlag(
        tenant_id=user.tenant_id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        confidence=payload.confidence,
        categories_json=json.dumps(payload.categories),
        flagged_by="api",
        status="pending",
    )
    db.add(flag)
    db.commit()
    db.refresh(flag)
    return flag


@router.post("/moderate/{target_type}/{target_id}", response_model=AiFlagOut, status_code=201)
def auto_moderate_stub(
    target_type: str,
    target_id: str,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Stub AI moderation — flags content with simulated confidence for admin review."""
    confidence = 75
    categories = ["needs_review"]
    if target_type == "post":
        post = db.query(Post).filter(Post.id == target_id).first()
        if post and any(w in post.body.lower() for w in ("spam", "scam", "hate")):
            confidence = 92
            categories = ["spam", "policy_violation"]

    flag = AiModerationFlag(
        tenant_id=user.tenant_id,
        target_type=target_type,
        target_id=target_id,
        confidence=confidence,
        categories_json=json.dumps(categories),
        flagged_by="system",
        status="pending",
    )
    db.add(flag)
    db.commit()
    db.refresh(flag)
    return flag
