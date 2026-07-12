from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, get_optional_user
from app.models import Comment, Post, PostAudience, PostType, Reaction, User
from app.schemas import AuthorBrief, CommentCreate, CommentOut, PostCreate, PostOut, PostUpdate, ReactionCreate
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(tags=["Posts"])


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
    reaction_count = db.query(func.count(Reaction.id)).filter(Reaction.post_id == post.id).scalar() or 0
    comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id).scalar() or 0
    user_reacted = False
    if current_user:
        user_reacted = (
            db.query(Reaction).filter(Reaction.post_id == post.id, Reaction.actor_id == current_user.id).first()
            is not None
        )
    return PostOut(
        id=post.id,
        author_id=post.author_id,
        community_id=post.community_id,
        type=_enum_val(post.type),
        body=post.body,
        audience=_enum_val(post.audience),
        status=post.status,
        image_url=post.image_url,
        created_at=post.created_at,
        author=_author_brief(post.author),
        reaction_count=reaction_count,
        comment_count=comment_count,
        user_reacted=user_reacted,
    )


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
    comment = Comment(post_id=post_id, author_id=user.id, body=payload.body, parent_id=payload.parent_id)
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


@router.put("/posts/{post_id}/reactions")
def react_post(post_id: str, payload: ReactionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(Reaction).filter(Reaction.post_id == post_id, Reaction.actor_id == user.id).first()
    if existing:
        existing.reaction_type = payload.reaction_type
    else:
        db.add(Reaction(actor_id=user.id, post_id=post_id, reaction_type=payload.reaction_type))
    db.commit()
    return {"status": "reacted"}


@router.delete("/posts/{post_id}/reactions")
def unreact_post(post_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Reaction).filter(Reaction.post_id == post_id, Reaction.actor_id == user.id).delete()
    db.commit()
    return {"status": "unreacted"}
