import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, get_optional_user
from app.models import Comment, Post, PostAudience, PostType, Reaction, Share, User
from app.schemas import (
    AuthorBrief,
    CommentCreate,
    CommentOut,
    CommentUserOut,
    PostCreate,
    PostOut,
    PostUpdate,
    ReactionCreate,
    ReactionUserOut,
    ShareUserOut,
)
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(tags=["Posts"])

VALID_REACTION_TYPES = {"like", "dislike"}
SPAM_PATTERNS = re.compile(r"(.)\1{9,}|https?://\S+\s+https?://\S+", re.IGNORECASE)


def _enum_val(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _author_brief(user: User | None) -> AuthorBrief | None:
    if not user or not user.profile:
        return None
    return AuthorBrief(
        id=user.id,
        username=user.profile.username,
        display_name=user.profile.display_name,
        avatar_url=user.profile.avatar_url,
    )


def _post_out(post: Post, current_user: User | None, db: Session) -> PostOut:
    like_count = (
        db.query(func.count(Reaction.id))
        .filter(Reaction.post_id == post.id, Reaction.reaction_type == "like")
        .scalar()
        or 0
    )
    dislike_count = (
        db.query(func.count(Reaction.id))
        .filter(Reaction.post_id == post.id, Reaction.reaction_type == "dislike")
        .scalar()
        or 0
    )
    comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id).scalar() or 0
    share_count = db.query(func.count(Share.id)).filter(Share.post_id == post.id).scalar() or 0
    user_reaction_type = None
    if current_user:
        reaction = (
            db.query(Reaction)
            .filter(Reaction.post_id == post.id, Reaction.actor_id == current_user.id)
            .first()
        )
        if reaction:
            user_reaction_type = reaction.reaction_type
    return PostOut(
        id=post.id,
        author_id=post.author_id,
        community_id=post.community_id,
        type=_enum_val(post.type),
        body=post.body,
        audience=_enum_val(post.audience),
        status=post.status,
        image_url=post.image_url,
        comments_enabled=getattr(post, "comments_enabled", True),
        created_at=post.created_at,
        author=_author_brief(post.author),
        like_count=like_count,
        dislike_count=dislike_count,
        reaction_count=like_count + dislike_count,
        comment_count=comment_count,
        share_count=share_count,
        user_reacted=user_reaction_type is not None,
        user_reaction_type=user_reaction_type,
    )


def _validate_comment_body(body: str) -> str:
    body = body.strip()
    if not body:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    if len(body) < 1 or len(body) > 2000:
        raise HTTPException(status_code=400, detail="Comment must be between 1 and 2000 characters")
    if SPAM_PATTERNS.search(body):
        raise HTTPException(status_code=400, detail="Comment appears to be spam")
    return body


@router.get("/posts", response_model=dict)
def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query(None),
    sort_order: str = Query("desc"),
    search: str | None = Query(None),
    community_id: str | None = Query(None),
    author_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    params = PaginationParams(page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order, search=search)
    query = db.query(Post).options(joinedload(Post.author).joinedload(User.profile)).filter(Post.status == "published")
    if community_id:
        query = query.filter(Post.community_id == community_id)
    if author_id:
        query = query.filter(Post.author_id == author_id)
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", search_fields=[Post.body], sort_map={"created_at": Post.created_at}
    )
    return paginated([_post_out(p, current_user, db) for p in items], total, params, total_pages)


@router.get("/feed", response_model=dict)
def get_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    params = PaginationParams(page=page, page_size=page_size)
    query = (
        db.query(Post)
        .options(joinedload(Post.author).joinedload(User.profile))
        .filter(Post.status == "published")
        .order_by(Post.created_at.desc())
    )
    items, total, total_pages = apply_pagination(query, params, default_sort="created_at", sort_map={"created_at": Post.created_at})
    return paginated([_post_out(p, user, db) for p in items], total, params, total_pages)


@router.post("/posts", response_model=PostOut, status_code=201)
def create_post(payload: PostCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = Post(
        tenant_id=user.tenant_id,
        author_id=user.id,
        body=payload.body,
        type=PostType(payload.type),
        audience=PostAudience(payload.audience),
        community_id=payload.community_id,
        image_url=payload.image_url,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    post = db.query(Post).options(joinedload(Post.author).joinedload(User.profile)).filter(Post.id == post.id).first()
    return _post_out(post, user, db)


@router.get("/posts/{post_id}", response_model=PostOut)
def get_post(post_id: str, db: Session = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    post = db.query(Post).options(joinedload(Post.author).joinedload(User.profile)).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _post_out(post, current_user, db)


@router.patch("/posts/{post_id}", response_model=PostOut)
def update_post(post_id: str, payload: PostUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.author_id == user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(post, field, value)
    db.commit()
    post = db.query(Post).options(joinedload(Post.author).joinedload(User.profile)).filter(Post.id == post_id).first()
    return _post_out(post, user, db)


@router.delete("/posts/{post_id}")
def delete_post(post_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.author_id == user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
    return {"status": "deleted"}


@router.get("/posts/{post_id}/comments", response_model=dict)
def list_comments(
    post_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    params = PaginationParams(page=page, page_size=page_size, search=search)
    query = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .options(joinedload(Comment.author).joinedload(User.profile))
    )
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", search_fields=[Comment.body], sort_map={"created_at": Comment.created_at}
    )
    out = []
    for c in items:
        rc = db.query(func.count(Reaction.id)).filter(Reaction.comment_id == c.id).scalar() or 0
        out.append(
            CommentOut(
                id=c.id,
                post_id=c.post_id,
                author_id=c.author_id,
                parent_id=c.parent_id,
                body=c.body,
                created_at=c.created_at,
                author=_author_brief(c.author),
                reaction_count=rc,
            )
        )
    return paginated(out, total, params, total_pages)


@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=201)
def create_comment(post_id: str, payload: CommentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if not getattr(post, "comments_enabled", True):
        raise HTTPException(status_code=403, detail="Comments are disabled on this post")
    body = _validate_comment_body(payload.body)
    if payload.parent_id:
        parent = db.query(Comment).filter(Comment.id == payload.parent_id, Comment.post_id == post_id).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent comment not found on this post")
    comment = Comment(post_id=post_id, author_id=user.id, body=body, parent_id=payload.parent_id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    comment = db.query(Comment).options(joinedload(Comment.author).joinedload(User.profile)).filter(Comment.id == comment.id).first()
    return CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        author_id=comment.author_id,
        parent_id=comment.parent_id,
        body=comment.body,
        created_at=comment.created_at,
        author=_author_brief(comment.author),
        reaction_count=0,
    )


def _upsert_reaction(post_id: str, payload: ReactionCreate, user: User, db: Session):
    if payload.reaction_type not in VALID_REACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid reaction type. Must be one of: {', '.join(VALID_REACTION_TYPES)}")
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(Reaction).filter(Reaction.post_id == post_id, Reaction.actor_id == user.id).first()
    if existing:
        if existing.reaction_type == payload.reaction_type:
            db.delete(existing)
            db.commit()
            return {"status": "unreacted", "reaction_type": None}
        existing.reaction_type = payload.reaction_type
    else:
        db.add(Reaction(actor_id=user.id, post_id=post_id, reaction_type=payload.reaction_type))
    db.commit()
    return {"status": "reacted", "reaction_type": payload.reaction_type}


@router.put("/posts/{post_id}/reactions")
def react_post_put(post_id: str, payload: ReactionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _upsert_reaction(post_id, payload, user, db)


@router.post("/posts/{post_id}/reactions")
def react_post_post(post_id: str, payload: ReactionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _upsert_reaction(post_id, payload, user, db)


@router.delete("/posts/{post_id}/reactions")
def unreact_post(post_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    deleted = db.query(Reaction).filter(Reaction.post_id == post_id, Reaction.actor_id == user.id).delete()
    db.commit()
    return {"status": "unreacted" if deleted else "no_reaction"}


@router.get("/posts/{post_id}/reactions", response_model=dict)
def list_reactions(
    post_id: str,
    reaction_type: str | None = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    params = PaginationParams(page=page, page_size=page_size)
    query = (
        db.query(Reaction)
        .filter(Reaction.post_id == post_id)
        .options(joinedload(Reaction.actor).joinedload(User.profile))
    )
    if reaction_type:
        query = query.filter(Reaction.reaction_type == reaction_type)
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": Reaction.created_at}
    )
    out = [
        ReactionUserOut(
            id=r.id,
            reaction_type=r.reaction_type,
            created_at=r.created_at,
            user=_author_brief(r.actor),
        )
        for r in items
    ]
    return paginated(out, total, params, total_pages)


@router.post("/posts/{post_id}/share", status_code=201)
def share_post(post_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(Share).filter(Share.post_id == post_id, Share.user_id == user.id).first()
    if existing:
        return {"status": "already_shared", "share_id": existing.id}
    share = Share(user_id=user.id, post_id=post_id)
    db.add(share)
    db.commit()
    db.refresh(share)
    return {"status": "shared", "share_id": share.id}


@router.get("/posts/{post_id}/shares", response_model=dict)
def list_shares(
    post_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    params = PaginationParams(page=page, page_size=page_size)
    query = (
        db.query(Share)
        .filter(Share.post_id == post_id)
        .options(joinedload(Share.user).joinedload(User.profile))
    )
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": Share.created_at}
    )
    out = [
        ShareUserOut(
            id=s.id,
            created_at=s.created_at,
            user=_author_brief(s.user),
        )
        for s in items
    ]
    return paginated(out, total, params, total_pages)


@router.get("/posts/{post_id}/comments/users", response_model=dict)
def list_comment_users(
    post_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    params = PaginationParams(page=page, page_size=page_size)
    query = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .options(joinedload(Comment.author).joinedload(User.profile))
    )
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": Comment.created_at}
    )
    out = [
        CommentUserOut(
            id=c.id,
            body=c.body,
            created_at=c.created_at,
            user=_author_brief(c.author),
        )
        for c in items
    ]
    return paginated(out, total, params, total_pages)
