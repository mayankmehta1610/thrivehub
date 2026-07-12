from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, get_optional_user
from app.models import Community, CommunityMember, MembershipRole, MembershipStatus, User
from app.routers.posts import _author_brief
from app.schemas import CommunityCreate, CommunityMemberOut, CommunityMemberRoleUpdate, CommunityOut
from app.utils.pagination import PaginationParams, apply_pagination, paginated

router = APIRouter(prefix="/communities", tags=["Communities"])


def _community_out(community: Community, db: Session, user: User | None = None) -> CommunityOut:
    member_count = db.query(func.count(CommunityMember.id)).filter(
        CommunityMember.community_id == community.id,
        CommunityMember.status == MembershipStatus.active,
    ).scalar() or 0
    is_member = False
    my_role = None
    if user:
        membership = db.query(CommunityMember).filter(
            CommunityMember.community_id == community.id, CommunityMember.user_id == user.id
        ).first()
        if membership:
            is_member = True
            my_role = membership.role.value if hasattr(membership.role, "value") else membership.role
    return CommunityOut(
        id=community.id,
        name=community.name,
        slug=community.slug,
        description=community.description,
        cover_url=community.cover_url,
        visibility=community.visibility.value,
        status=community.status,
        member_count=member_count,
        created_at=community.created_at,
        owner=_author_brief(community.owner),
        is_member=is_member,
        my_role=my_role,
    )


@router.get("", response_model=dict)
def list_communities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query(None),
    sort_order: str = Query("desc"),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    params = PaginationParams(page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order, search=search)
    query = db.query(Community).options(joinedload(Community.owner).joinedload(User.profile)).filter(Community.status == "active")
    items, total, total_pages = apply_pagination(
        query,
        params,
        default_sort="created_at",
        search_fields=[Community.name, Community.description, Community.slug],
        sort_map={"created_at": Community.created_at, "name": Community.name},
    )
    return paginated([_community_out(c, db, user) for c in items], total, params, total_pages)


@router.post("", response_model=CommunityOut, status_code=201)
def create_community(payload: CommunityCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.query(Community).filter(Community.tenant_id == user.tenant_id, Community.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="Slug already exists")
    community = Community(
        tenant_id=user.tenant_id,
        owner_id=user.id,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        cover_url=payload.cover_url or "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200",
        category_id=payload.category_id,
        visibility=payload.visibility,
    )
    db.add(community)
    db.flush()
    db.add(
        CommunityMember(
            community_id=community.id,
            user_id=user.id,
            role=MembershipRole.admin,
            status=MembershipStatus.active,
        )
    )
    db.commit()
    community = (
        db.query(Community)
        .options(joinedload(Community.owner).joinedload(User.profile))
        .filter(Community.id == community.id)
        .first()
    )
    return _community_out(community, db, user)


@router.get("/{slug}", response_model=CommunityOut)
def get_community(slug: str, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    community = (
        db.query(Community)
        .options(joinedload(Community.owner).joinedload(User.profile))
        .filter(Community.slug == slug)
        .first()
    )
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    return _community_out(community, db, user)


@router.post("/{slug}/join", status_code=201)
def join_community(slug: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    community = db.query(Community).filter(Community.slug == slug).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    existing = db.query(CommunityMember).filter(
        CommunityMember.community_id == community.id, CommunityMember.user_id == user.id
    ).first()
    if existing:
        return {"status": "already_member"}
    db.add(
        CommunityMember(
            community_id=community.id,
            user_id=user.id,
            role=MembershipRole.member,
            status=MembershipStatus.active,
        )
    )
    db.commit()
    return {"status": "joined"}


@router.delete("/{slug}/leave")
def leave_community(slug: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    community = db.query(Community).filter(Community.slug == slug).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    db.query(CommunityMember).filter(
        CommunityMember.community_id == community.id, CommunityMember.user_id == user.id
    ).delete()
    db.commit()
    return {"status": "left"}


def _require_community(slug: str, db: Session) -> Community:
    community = db.query(Community).filter(Community.slug == slug).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    return community


def _is_community_admin(db: Session, community_id: str, user_id: str) -> bool:
    m = (
        db.query(CommunityMember)
        .filter(CommunityMember.community_id == community_id, CommunityMember.user_id == user_id)
        .first()
    )
    return bool(m and (m.role == MembershipRole.admin or m.role == MembershipRole.moderator))


@router.get("/{slug}/members", response_model=list[CommunityMemberOut])
def list_members(slug: str, db: Session = Depends(get_db)):
    community = _require_community(slug, db)
    members = (
        db.query(CommunityMember)
        .options(joinedload(CommunityMember.user).joinedload(User.profile))
        .filter(CommunityMember.community_id == community.id, CommunityMember.status == MembershipStatus.active)
        .all()
    )
    return [
        CommunityMemberOut(
            user=_author_brief(m.user),
            role=m.role.value if hasattr(m.role, "value") else m.role,
            status=m.status.value if hasattr(m.status, "value") else m.status,
        )
        for m in members
    ]


@router.patch("/{slug}/members/{user_id}", response_model=CommunityMemberOut)
def update_member_role(
    slug: str,
    user_id: str,
    payload: CommunityMemberRoleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    community = _require_community(slug, db)
    # Only a community admin (or the platform owner) can change roles.
    if community.owner_id != user.id and not _is_community_admin(db, community.id, user.id):
        raise HTTPException(status_code=403, detail="Only community admins can manage roles")
    try:
        new_role = MembershipRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")

    member = (
        db.query(CommunityMember)
        .options(joinedload(CommunityMember.user).joinedload(User.profile))
        .filter(CommunityMember.community_id == community.id, CommunityMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.role = new_role
    db.commit()
    db.refresh(member)
    return CommunityMemberOut(
        user=_author_brief(member.user),
        role=member.role.value if hasattr(member.role, "value") else member.role,
        status=member.status.value if hasattr(member.status, "value") else member.status,
    )
