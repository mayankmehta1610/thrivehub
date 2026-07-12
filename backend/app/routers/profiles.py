from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user, get_optional_user
from app.database import get_db
from app.models import Follow, FollowStatus, Profile, Reaction, User, UserSkill
from app.schemas import AuthorBrief, ProfileOut, ProfileUpdate, UserOut
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(prefix="/profiles", tags=["Profiles"])


def _author_brief(user: User | None) -> AuthorBrief | None:
    if not user or not user.profile:
        return None
    return AuthorBrief(
        id=user.id,
        username=user.profile.username,
        display_name=user.profile.display_name,
        avatar_url=user.profile.avatar_url,
    )


@router.get("", response_model=dict)
def list_profiles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query(None),
    sort_order: str = Query("desc"),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order, search=search)
    query = db.query(Profile).join(User).options(joinedload(Profile.user))
    sort_map = {
        "username": Profile.username,
        "display_name": Profile.display_name,
        "created_at": Profile.created_at,
    }
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", search_fields=[Profile.username, Profile.display_name, Profile.bio], sort_map=sort_map
    )
    return paginated([ProfileOut.model_validate(p) for p in items], total, params, total_pages)


@router.get("/{username}", response_model=ProfileOut)
def get_profile(username: str, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.username == username).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch("/me", response_model=ProfileOut)
def update_my_profile(payload: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{username}/followers", response_model=dict)
def list_followers(
    username: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.username == username).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    params = PaginationParams(page=page, page_size=page_size, search=search)
    query = (
        db.query(Follow)
        .filter(Follow.following_id == profile.user_id, Follow.status == FollowStatus.accepted)
        .options(joinedload(Follow.follower).joinedload(User.profile))
    )
    items, total, total_pages = apply_pagination(query, params, default_sort="created_at", sort_map={"created_at": Follow.created_at})
    result = [_author_brief(f.follower) for f in items if f.follower]
    return paginated(result, total, params, total_pages)


@router.get("/{username}/following", response_model=dict)
def list_following(
    username: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.username == username).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    params = PaginationParams(page=page, page_size=page_size, search=search)
    query = (
        db.query(Follow)
        .filter(Follow.follower_id == profile.user_id, Follow.status == FollowStatus.accepted)
        .options(joinedload(Follow.following).joinedload(User.profile))
    )
    items, total, total_pages = apply_pagination(query, params, default_sort="created_at", sort_map={"created_at": Follow.created_at})
    result = [_author_brief(f.following) for f in items if f.following]
    return paginated(result, total, params, total_pages)


@router.post("/{username}/follow", status_code=201)
def follow_user(username: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(Profile).filter(Profile.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="Profile not found")
    if target.user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    existing = db.query(Follow).filter(Follow.follower_id == user.id, Follow.following_id == target.user_id).first()
    if existing:
        return {"status": "already_following"}
    db.add(Follow(follower_id=user.id, following_id=target.user_id, status=FollowStatus.accepted))
    db.commit()
    return {"status": "following"}


@router.delete("/{username}/follow")
def unfollow_user(username: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(Profile).filter(Profile.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.query(Follow).filter(Follow.follower_id == user.id, Follow.following_id == target.user_id).delete()
    db.commit()
    return {"status": "unfollowed"}
