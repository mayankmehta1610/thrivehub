import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user
from app.database import get_db
from app.models import Follow, FollowStatus, MasterValue, Post, Profile, ProfilePhoto, Reaction, User, UserSkill
from app.schemas import (
    AuthorBrief,
    ProfileOut,
    ProfilePhotoCreate,
    ProfilePhotoOut,
    ProfileUpdate,
    UserSkillOut,
)
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(prefix="/profiles", tags=["Profiles"])


def _meta_image(m: MasterValue) -> str | None:
    if not m.metadata_json:
        return None
    try:
        return json.loads(m.metadata_json).get("image_url")
    except (json.JSONDecodeError, TypeError):
        return None


def _skill_out(us: UserSkill) -> UserSkillOut:
    skill = us.skill
    return UserSkillOut(
        id=us.id,
        code=skill.code if skill else "",
        label=skill.label if skill else "",
        level=us.level,
        years=us.years,
        image_url=_meta_image(skill) if skill else None,
    )


def _profile_out(profile: Profile, db: Session) -> ProfileOut:
    follower_count = (
        db.query(func.count(Follow.id))
        .filter(Follow.following_id == profile.user_id, Follow.status == FollowStatus.accepted)
        .scalar()
        or 0
    )
    following_count = (
        db.query(func.count(Follow.id))
        .filter(Follow.follower_id == profile.user_id, Follow.status == FollowStatus.accepted)
        .scalar()
        or 0
    )
    post_count = (
        db.query(func.count(Post.id))
        .filter(Post.author_id == profile.user_id, Post.status == "published")
        .scalar()
        or 0
    )
    skills = sorted(
        [_skill_out(us) for us in profile.skills if us.skill],
        key=lambda s: s.label,
    )
    photos = sorted(
        [ProfilePhotoOut.model_validate(p) for p in profile.photos if p.url and p.url.strip()],
        key=lambda p: p.sort_order,
    )
    return ProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        username=profile.username,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        cover_url=profile.cover_url,
        location=profile.location,
        website=profile.website,
        is_verified=profile.is_verified,
        created_at=profile.created_at,
        skills=skills,
        photos=photos,
        follower_count=follower_count,
        following_count=following_count,
        post_count=post_count,
    )


def _load_profile(db: Session, username: str) -> Profile | None:
    return (
        db.query(Profile)
        .options(
            joinedload(Profile.skills).joinedload(UserSkill.skill),
            joinedload(Profile.photos),
        )
        .filter(Profile.username == username)
        .first()
    )


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
    query = db.query(Profile).join(User).options(
        joinedload(Profile.skills).joinedload(UserSkill.skill),
        joinedload(Profile.photos),
    )
    sort_map = {
        "username": Profile.username,
        "display_name": Profile.display_name,
        "created_at": Profile.created_at,
    }
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", search_fields=[Profile.username, Profile.display_name, Profile.bio], sort_map=sort_map
    )
    return paginated([_profile_out(p, db) for p in items], total, params, total_pages)


@router.get("/{username}", response_model=ProfileOut)
def get_profile(username: str, db: Session = Depends(get_db)):
    profile = _load_profile(db, username)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return _profile_out(profile, db)


@router.patch("/me", response_model=ProfileOut)
def update_my_profile(payload: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = (
        db.query(Profile)
        .options(
            joinedload(Profile.skills).joinedload(UserSkill.skill),
            joinedload(Profile.photos),
        )
        .filter(Profile.user_id == user.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return _profile_out(profile, db)


@router.get("/{username}/skills", response_model=list[UserSkillOut])
def get_profile_skills(username: str, db: Session = Depends(get_db)):
    profile = _load_profile(db, username)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return sorted([_skill_out(us) for us in profile.skills if us.skill], key=lambda s: s.label)


@router.get("/{username}/photos", response_model=list[ProfilePhotoOut])
def get_profile_photos(username: str, db: Session = Depends(get_db)):
    profile = _load_profile(db, username)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return sorted(
        [ProfilePhotoOut.model_validate(p) for p in profile.photos if p.url and p.url.strip()],
        key=lambda p: p.sort_order,
    )


@router.post("/me/photos", response_model=ProfilePhotoOut, status_code=201)
def add_profile_photo(payload: ProfilePhotoCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    photo = ProfilePhoto(
        profile_id=profile.id,
        url=payload.url,
        caption=payload.caption,
        sort_order=payload.sort_order,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return ProfilePhotoOut.model_validate(photo)


@router.delete("/me/photos/{photo_id}", status_code=204)
def delete_profile_photo(photo_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    photo = db.query(ProfilePhoto).filter(ProfilePhoto.id == photo_id, ProfilePhoto.profile_id == profile.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    db.delete(photo)
    db.commit()


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
