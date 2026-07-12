import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    AiModerationFlag,
    AuditLog,
    Comment,
    Community,
    CommunityMember,
    CommunityVisibility,
    Conversation,
    ConversationParticipant,
    ConversationType,
    Event,
    EventParticipant,
    Follow,
    FollowStatus,
    MasterValue,
    MembershipRole,
    MembershipStatus,
    Message,
    ModerationAction,
    Notification,
    NotificationType,
    Post,
    PostAudience,
    PostType,
    Profile,
    ProfilePhoto,
    Reaction,
    Report,
    Sponsorship,
    SubscriptionTier,
    Tenant,
    User,
    UserSkill,
    UserStatus,
    UserSubscription,
)
from app.utils.security import hash_password

# ── Unsplash image URLs (free license, hotlink OK) ──────────────────────────

HERO_IMAGE = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600"

SKILL_CATEGORIES = [
    ("dance", "Dance", "Express yourself through movement", "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800"),
    ("standup", "Standup Comedy", "Make 'em laugh on stage", "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800"),
    ("sports", "Sports", "Compete, train, and win together", "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800"),
    ("adventure", "Adventure", "Explore trails, peaks, and beyond", "https://images.unsplash.com/photo-1551632811-561732d1e58e?w=800"),
    ("music", "Music", "Jam, perform, and discover artists", "https://images.unsplash.com/photo-1511379938543-c1f69419868d?w=800"),
    ("art", "Art & Design", "Create, share, and inspire", "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800"),
    ("fitness", "Fitness", "Build strength and healthy habits", "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800"),
    ("photography", "Photography", "Capture moments that matter", "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800"),
    ("cooking", "Cooking", "Recipes, flavors, and food culture", "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800"),
]

DEMO_USERS = [
    ("admin@thrivehub.com", "admin123", "Admin User", "admin", True, "admin", "Platform administrator", 0),
    ("ops@thrivehub.com", "admin123", "Ops Manager", "opsmanager", True, "tenant_admin", "Operations & moderation lead", 1),
    ("alex@thrivehub.com", "demo1234", "Alex Rivera", "alexrivera", True, "member", "Marathon runner & community builder", 2),
    ("sam@thrivehub.com", "demo1234", "Sam Chen", "samchen", False, "member", "Outdoor adventurer & trail guide", 3),
    ("jordan@thrivehub.com", "demo1234", "Jordan Lee", "jordanlee", True, "member", "Weekend football organiser", 4),
    ("dancer@thrivehub.com", "demo1234", "Priya Sharma", "priyadance", True, "member", "Salsa & contemporary dance instructor", 5),
    ("comedian@thrivehub.com", "demo1234", "Marcus Webb", "marcuswebb", True, "member", "Standup comedian — open mic regular", 6),
    ("mia@thrivehub.com", "demo1234", "Mia Torres", "miatorres", False, "member", "Singer-songwriter & music teacher", 7),
    ("chef@thrivehub.com", "demo1234", "Elena Park", "elenapark", True, "member", "Home chef sharing global recipes", 8),
    ("lens@thrivehub.com", "demo1234", "Chris Nguyen", "chrislens", True, "member", "Street & landscape photographer", 9),
    ("riley@thrivehub.com", "demo1234", "Riley Brooks", "rileybrooks", False, "member", "CrossFit coach & wellness advocate", 10),
    ("art@thrivehub.com", "demo1234", "Sofia Mendez", "sofiamendez", True, "member", "Digital artist & mural painter", 11),
]

AVATARS = [
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200",
    "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200",
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200",
]

COVERS = [
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200",
    "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
    "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1200",
    "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200",
    "https://images.unsplash.com/photo-1511379938543-c1f69419868d?w=1200",
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200",
    "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200",
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200",
]

LOCATIONS = [
    "San Francisco, CA", "Austin, TX", "Denver, CO", "Seattle, WA",
    "Los Angeles, CA", "Chicago, IL", "Portland, OR", "Miami, FL",
    "New York, NY", "Boston, MA", "Nashville, TN", "Phoenix, AZ",
]

# Rich profile extensions keyed by username (upserted idempotently)
RICH_PROFILES: dict[str, dict] = {
    "mayank": {
        "emails": ["mehta_mayankp@hotmail.com", "mayank@thrivehub.com", "mayank@"],
        "password": "demo1234",
        "display_name": "Mayank Mehta",
        "verified": True,
        "role": "member",
        "bio": (
            "Creative explorer at the intersection of dance, photography, and adventure. "
            "I choreograph weekend workshops, chase golden-hour light across mountain trails, "
            "and build communities where passion meets purpose. Always up for a salsa night "
            "or a sunrise hike — let's create something memorable together."
        ),
        "location": "San Francisco, CA",
        "website": "https://thrivehub.com",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
        "cover_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600",
        "skills": ["dance", "photography", "adventure", "music", "fitness"],
        "photos": [
            ("https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800", "Salsa night energy"),
            ("https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800", "Golden hour portrait session"),
            ("https://images.unsplash.com/photo-1551632811-561732d1e58e?w=800", "Summit sunrise hike"),
            ("https://images.unsplash.com/photo-1511379938543-c1f69419868d?w=800", "Acoustic jam session"),
            ("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800", "Alpine trail adventure"),
        ],
        "posts": [
            ("Just wrapped an incredible salsa workshop — 40 dancers, one unforgettable night! Who's joining the next session?",
             PostType.image, "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800"),
            ("Caught this frame at Twin Peaks during last night's fog roll. Photography teaches you to see the world differently.",
             PostType.image, "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800"),
            ("Planning a weekend adventure trek along the coastal trail. DM me if you want in — all experience levels welcome!",
             PostType.text, None),
        ],
    },
    "alexrivera": {
        "bio": "Marathon runner, trail explorer, and community builder. I believe every mile tells a story. Organizing group runs and outdoor meetups across the Bay Area.",
        "skills": ["running", "adventure", "sports", "fitness"],
        "photos": [
            ("https://images.unsplash.com/photo-1452626038306-9d505387a3a8?w=800", "Marathon finish line"),
            ("https://images.unsplash.com/photo-1476480862128-209bfaa8edc8?w=800", "Trail run at dawn"),
            ("https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800", "Climbing session"),
        ],
    },
    "samchen": {
        "bio": "Outdoor adventurer and certified trail guide. From coastal hikes to alpine summits — I live for the path less traveled.",
        "skills": ["adventure", "hiking", "photography", "fitness"],
        "photos": [
            ("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", "Mountain vista"),
            ("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800", "Alpine lake"),
            ("https://images.unsplash.com/photo-1551632811-561732d1e58e?w=800", "Summit camp"),
        ],
    },
    "jordanlee": {
        "bio": "Weekend football organiser and sports enthusiast. Building pickup leagues and bringing neighbors together through the beautiful game.",
        "skills": ["sports", "football", "fitness"],
        "photos": [
            ("https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800", "Match day"),
            ("https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800", "Team huddle"),
        ],
    },
    "priyadance": {
        "bio": "Salsa & contemporary dance instructor with 8+ years on stage. Teaching confidence through movement — beginners always welcome!",
        "skills": ["dance", "music", "fitness"],
        "photos": [
            ("https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800", "Studio rehearsal"),
            ("https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800", "Performance night"),
            ("https://images.unsplash.com/photo-1545950250-29ebb58419f4?w=800", "Group class"),
        ],
    },
    "marcuswebb": {
        "bio": "Standup comedian and open mic regular. Turning awkward life moments into punchlines since 2019. Catch me at The Laugh Loft every Thursday.",
        "skills": ["standup", "public_speaking", "music"],
        "photos": [
            ("https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800", "Open mic night"),
            ("https://images.unsplash.com/photo-1527224535757-9fc19466b1e5?w=800", "Writing session"),
        ],
    },
    "miatorres": {
        "bio": "Singer-songwriter and music teacher. Acoustic covers, original compositions, and vocal coaching for all ages.",
        "skills": ["music", "public_speaking", "art"],
        "photos": [
            ("https://images.unsplash.com/photo-1511379938543-c1f69419868d?w=800", "Studio recording"),
            ("https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800", "Live acoustic set"),
        ],
    },
    "elenapark": {
        "bio": "Home chef sharing global recipes and hosting community cook-offs. Korean BBQ enthusiast with a passion for fusion flavors.",
        "skills": ["cooking", "art"],
        "photos": [
            ("https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800", "Korean BBQ night"),
            ("https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800", "Farmers market haul"),
            ("https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800", "Cook-off champion dish"),
        ],
    },
    "chrislens": {
        "bio": "Street & landscape photographer. Chasing light, framing stories. Leading golden-hour photo walks every month.",
        "skills": ["photography", "art", "adventure"],
        "photos": [
            ("https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800", "Waterfront golden hour"),
            ("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800", "Forest light"),
            ("https://images.unsplash.com/photo-1477959858617-67f85ebb4e09?w=800", "City skyline"),
            ("https://images.unsplash.com/photo-1516035069371-29a1b244cc00?w=800", "Street portrait"),
        ],
    },
    "rileybrooks": {
        "bio": "CrossFit coach and wellness advocate. PRs, meal prep, and mindset — helping people become their strongest selves.",
        "skills": ["fitness", "sports", "coaching"],
        "photos": [
            ("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800", "Gym session"),
            ("https://images.unsplash.com/photo-1571019614242-c5c5dee9f50e?w=800", "Outdoor workout"),
        ],
    },
    "sofiamendez": {
        "bio": "Digital artist and mural painter. Bold colors, big energy. Turning blank walls into community landmarks.",
        "skills": ["art", "photography"],
        "photos": [
            ("https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800", "Latest mural"),
            ("https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800", "Studio work in progress"),
            ("https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800", "Gallery opening"),
        ],
    },
}

SKILL_KEY_PREFIXES = ("skill_category:", "skill:", "sport:", "adventure:")


def _upsert_master(db: Session, tenant_id: str, mtype: str, code: str, label: str,
                   desc: str | None, sort_order: int, metadata: dict | None = None) -> MasterValue:
    meta_str = json.dumps(metadata) if metadata else None
    existing = db.query(MasterValue).filter(
        MasterValue.tenant_id == tenant_id,
        MasterValue.master_type == mtype,
        MasterValue.code == code,
    ).first()
    if existing:
        existing.label = label
        existing.description = desc
        existing.sort_order = sort_order
        if meta_str:
            existing.metadata_json = meta_str
        return existing
    m = MasterValue(
        tenant_id=tenant_id, master_type=mtype, code=code, label=label,
        description=desc, sort_order=sort_order, metadata_json=meta_str,
    )
    db.add(m)
    db.flush()
    return m


def _resolve_skill_id(master_map: dict, code: str) -> str | None:
    for prefix in SKILL_KEY_PREFIXES:
        skill_id = master_map.get(f"{prefix}{code}")
        if skill_id:
            return skill_id
    return None


def _upsert_profile_fields(profile: Profile, data: dict, idx: int = 0) -> None:
    """Update profile scalar fields from rich data dict."""
    if data.get("display_name"):
        profile.display_name = data["display_name"]
    if data.get("bio"):
        profile.bio = data["bio"]
    if data.get("avatar_url"):
        profile.avatar_url = data["avatar_url"]
    elif not profile.avatar_url:
        profile.avatar_url = AVATARS[idx % len(AVATARS)]
    if data.get("cover_url"):
        profile.cover_url = data["cover_url"]
    elif not profile.cover_url:
        profile.cover_url = COVERS[idx % len(COVERS)]
    if data.get("location"):
        profile.location = data["location"]
    elif not profile.location:
        profile.location = LOCATIONS[idx % len(LOCATIONS)]
    if data.get("website"):
        profile.website = data["website"]
    if "verified" in data:
        profile.is_verified = data["verified"]


def _seed_profile_skills(db: Session, profile: Profile, skill_codes: list[str], master_map: dict) -> None:
    for code in skill_codes:
        skill_id = _resolve_skill_id(master_map, code)
        if not skill_id:
            continue
        exists = db.query(UserSkill).filter(UserSkill.profile_id == profile.id, UserSkill.skill_id == skill_id).first()
        if not exists:
            db.add(UserSkill(profile_id=profile.id, skill_id=skill_id, level="advanced", years=3))


def _seed_profile_photos(db: Session, profile: Profile, photos: list[tuple[str, str]]) -> None:
    for i, (url, caption) in enumerate(photos):
        exists = db.query(ProfilePhoto).filter(ProfilePhoto.profile_id == profile.id, ProfilePhoto.url == url).first()
        if not exists:
            db.add(ProfilePhoto(profile_id=profile.id, url=url, caption=caption, sort_order=i))


def _find_user_by_username_or_email(db: Session, tenant_id: str, username: str, emails: list[str] | None = None) -> User | None:
    profile = db.query(Profile).join(User).filter(
        User.tenant_id == tenant_id, Profile.username == username,
    ).first()
    if profile:
        return db.query(User).filter(User.id == profile.user_id).first()
    for email in (emails or []):
        user = db.query(User).filter(User.tenant_id == tenant_id, User.email == email).first()
        if user:
            return user
    return None


def _ensure_user(db: Session, tenant_id: str, email: str, pwd: str, name: str,
                 username: str, verified: bool, role: str, bio: str, idx: int) -> User:
    existing = db.query(User).filter(User.tenant_id == tenant_id, User.email == email).first()
    if existing:
        profile = db.query(Profile).filter(Profile.user_id == existing.id).first()
        rich = RICH_PROFILES.get(username, {})
        if profile:
            _upsert_profile_fields(profile, {"bio": bio, "verified": verified, **rich}, idx)
            if rich.get("skills"):
                _seed_profile_skills(db, profile, rich["skills"], _get_master_map(db, tenant_id))
            if rich.get("photos"):
                _seed_profile_photos(db, profile, rich["photos"])
        return existing
    u = User(
        tenant_id=tenant_id, email=email, password_hash=hash_password(pwd),
        status=UserStatus.active, role=role,
    )
    db.add(u)
    db.flush()
    rich = RICH_PROFILES.get(username, {})
    db.add(Profile(
        user_id=u.id, username=username, display_name=name,
        bio=rich.get("bio") or bio,
        avatar_url=rich.get("avatar_url") or AVATARS[idx % len(AVATARS)],
        cover_url=rich.get("cover_url") or COVERS[idx % len(COVERS)],
        location=rich.get("location") or LOCATIONS[idx % len(LOCATIONS)],
        website=rich.get("website"),
        is_verified=rich.get("verified", verified),
    ))
    db.flush()
    profile = db.query(Profile).filter(Profile.user_id == u.id).first()
    if profile and rich.get("skills"):
        _seed_profile_skills(db, profile, rich["skills"], _get_master_map(db, tenant_id))
    if profile and rich.get("photos"):
        _seed_profile_photos(db, profile, rich["photos"])
    return u


def _get_master_map(db: Session, tenant_id: str) -> dict:
    return {
        f"{m.master_type}:{m.code}": m.id
        for m in db.query(MasterValue).filter(MasterValue.tenant_id == tenant_id).all()
    }


def _upsert_registered_user(db: Session, tenant_id: str, username: str, data: dict, master_map: dict) -> User | None:
    """Upsert a registered user (e.g. @mayank) by username or email — idempotent."""
    emails = data.get("emails", [])
    user = _find_user_by_username_or_email(db, tenant_id, username, emails)
    primary_email = emails[0] if emails else f"{username}@thrivehub.com"

    if not user:
        user = User(
            tenant_id=tenant_id,
            email=primary_email,
            password_hash=hash_password(data.get("password", "demo1234")),
            status=UserStatus.active,
            role=data.get("role", "member"),
        )
        db.add(user)
        db.flush()
        profile = Profile(
            user_id=user.id,
            username=username,
            display_name=data.get("display_name", username.title()),
            bio=data.get("bio"),
            avatar_url=data.get("avatar_url"),
            cover_url=data.get("cover_url"),
            location=data.get("location"),
            website=data.get("website"),
            is_verified=data.get("verified", False),
        )
        db.add(profile)
        db.flush()
    else:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        if not profile:
            profile = Profile(user_id=user.id, username=username, display_name=data.get("display_name", username))
            db.add(profile)
            db.flush()
        else:
            if profile.username != username:
                profile.username = username
        _upsert_profile_fields(profile, data)

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if profile:
        if data.get("skills"):
            _seed_profile_skills(db, profile, data["skills"], master_map)
        if data.get("photos"):
            _seed_profile_photos(db, profile, data["photos"])
    return user


def seed_rich_profiles(db: Session, tenant_id: str, master_map: dict, users: list[User]) -> None:
    """Upsert rich profile data for all demo users and registered users like @mayank."""
    by_username = {}
    for u in users:
        p = db.query(Profile).filter(Profile.user_id == u.id).first()
        if p:
            by_username[p.username] = u

    for username, data in RICH_PROFILES.items():
        user = by_username.get(username)
        if user:
            profile = db.query(Profile).filter(Profile.user_id == user.id).first()
            if profile:
                _upsert_profile_fields(profile, data)
                if data.get("skills"):
                    _seed_profile_skills(db, profile, data["skills"], master_map)
                if data.get("photos"):
                    _seed_profile_photos(db, profile, data["photos"])
        elif data.get("emails"):
            _upsert_registered_user(db, tenant_id, username, data, master_map)

    # Seed posts for users with rich post data
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        return
    for username, data in RICH_PROFILES.items():
        posts = data.get("posts")
        if not posts:
            continue
        user = by_username.get(username) or _find_user_by_username_or_email(
            db, tenant_id, username, data.get("emails"),
        )
        if not user:
            continue
        for body, ptype, img in posts:
            _ensure_post(db, tenant, user, body, ptype, img)


def _ensure_community(db: Session, tenant, owner: User, name: str, slug: str, desc: str,
                      cover_url: str, category_code: str, master_map: dict, extra_members: list[User] | None = None) -> Community | None:
    existing = db.query(Community).filter(Community.tenant_id == tenant.id, Community.slug == slug).first()
    if existing:
        return existing
    cat_id = master_map.get(f"community_category:{category_code}") or master_map.get(f"skill_category:{category_code}")
    c = Community(
        tenant_id=tenant.id, owner_id=owner.id, name=name, slug=slug, description=desc,
        cover_url=cover_url, category_id=cat_id, visibility=CommunityVisibility.public,
    )
    db.add(c)
    db.flush()
    db.add(CommunityMember(community_id=c.id, user_id=owner.id, role=MembershipRole.admin, status=MembershipStatus.active))
    for m in (extra_members or []):
        db.add(CommunityMember(community_id=c.id, user_id=m.id, role=MembershipRole.member, status=MembershipStatus.active))
    return c


def _ensure_event(db: Session, tenant, organiser: User, title: str, desc: str, venue: str,
                  image_url: str, days_ahead: int, capacity: int, event_type_code: str,
                  master_map: dict, community_id: str | None = None) -> Event | None:
    existing = db.query(Event).filter(Event.tenant_id == tenant.id, Event.title == title).first()
    if existing:
        return existing
    now = datetime.now(timezone.utc)
    e = Event(
        tenant_id=tenant.id, organiser_id=organiser.id, community_id=community_id,
        title=title, description=desc, venue=venue, image_url=image_url,
        start_at=now + timedelta(days=days_ahead), capacity=capacity,
        event_type_id=master_map.get(f"event_type:{event_type_code}"),
    )
    db.add(e)
    db.flush()
    return e


def _ensure_post(db: Session, tenant, author: User, body: str, ptype: PostType,
                 image_url: str | None = None, community_id: str | None = None) -> Post | None:
    existing = db.query(Post).filter(
        Post.tenant_id == tenant.id, Post.author_id == author.id, Post.body == body,
    ).first()
    if existing:
        return existing
    post = Post(
        tenant_id=tenant.id, author_id=author.id, body=body, type=ptype,
        audience=PostAudience.public, image_url=image_url, community_id=community_id,
    )
    db.add(post)
    db.flush()
    return post


def seed_platform_masters(db: Session, tenant_id: str) -> dict:
    """Upsert all platform masters; returns code→id map."""
    master_map: dict[str, str] = {}
    sort = 0

    platform_configs = [
        ("app_name", "ThriveHub", "Community platform brand name"),
        ("tagline", "Where skills, sports & adventures come alive", "Hero tagline"),
        ("hero_image", HERO_IMAGE, None),
        ("primary_color", "#6366F1", None),
        ("secondary_color", "#EC4899", None),
        ("accent_color", "#14B8A6", None),
        ("hero_subtitle", "Join vibrant communities for dance, comedy, sports, music & more", None),
        ("image_max_bytes", "512000", "Max image upload size in bytes (500 KB)"),
        ("video_max_bytes", "2097152", "Max video upload size in bytes (2 MB)"),
    ]
    for code, label, desc in platform_configs:
        m = _upsert_master(db, tenant_id, "platform_config", code, label, desc, sort)
        master_map[f"platform_config:{code}"] = m.id
        sort += 1

    features = [
        ("profiles", "Rich Profiles", "Showcase skills, sports and achievements"),
        ("communities", "Communities", "Join groups around your passions"),
        ("events", "Events", "Discover workshops, meetups & tournaments"),
        ("messaging", "Messaging", "Connect with friends and groups"),
    ]
    for code, label, desc in features:
        m = _upsert_master(db, tenant_id, "feature", code, label, desc, sort)
        master_map[f"feature:{code}"] = m.id
        sort += 1

    for i, (code, label, desc, img) in enumerate(SKILL_CATEGORIES):
        m = _upsert_master(db, tenant_id, "skill_category", code, label, desc, i,
                           metadata={"image_url": img})
        master_map[f"skill_category:{code}"] = m.id

    legacy_skills = [
        ("photography", "Photography", "Visual storytelling"),
        ("coaching", "Coaching", "Training and mentoring"),
        ("public_speaking", "Public Speaking", "Communication skills"),
        ("dance", "Dance", "Movement arts"),
        ("standup", "Standup Comedy", "Stage comedy"),
    ]
    for i, (code, label, desc) in enumerate(legacy_skills):
        m = _upsert_master(db, tenant_id, "skill", code, label, desc, i)
        master_map[f"skill:{code}"] = m.id

    sports = [("football", "Football", "Team sport"), ("running", "Running", "Endurance sport"), ("yoga", "Yoga", "Mind-body wellness")]
    for i, (code, label, desc) in enumerate(sports):
        m = _upsert_master(db, tenant_id, "sport", code, label, desc, i)
        master_map[f"sport:{code}"] = m.id

    adventures = [("hiking", "Hiking", "Trail adventures"), ("climbing", "Rock Climbing", "Vertical adventures")]
    for i, (code, label, desc) in enumerate(adventures):
        m = _upsert_master(db, tenant_id, "adventure", code, label, desc, i)
        master_map[f"adventure:{code}"] = m.id

    event_types = [("meetup", "Meetup", "Community gathering"), ("tournament", "Tournament", "Competitive event"), ("workshop", "Workshop", "Hands-on learning")]
    for i, (code, label, desc) in enumerate(event_types):
        m = _upsert_master(db, tenant_id, "event_type", code, label, desc, i)
        master_map[f"event_type:{code}"] = m.id

    community_cats = [
        ("sports", "Sports", "Sports communities"),
        ("adventure", "Adventure", "Outdoor enthusiasts"),
        ("dance", "Dance", "Dance & movement"),
        ("comedy", "Comedy", "Standup & improv"),
        ("music", "Music", "Musicians & fans"),
        ("food", "Food & Cooking", "Culinary communities"),
        ("arts", "Arts", "Visual & digital arts"),
        ("fitness", "Fitness", "Health & wellness"),
    ]
    for i, (code, label, desc) in enumerate(community_cats):
        m = _upsert_master(db, tenant_id, "community_category", code, label, desc, i)
        master_map[f"community_category:{code}"] = m.id

    reactions = [("like", "Like", "Appreciation"), ("celebrate", "Celebrate", "Achievement celebration")]
    for i, (code, label, desc) in enumerate(reactions):
        m = _upsert_master(db, tenant_id, "reaction", code, label, desc, i)
        master_map[f"reaction:{code}"] = m.id

    reports = [("spam", "Spam", "Unwanted content"), ("harassment", "Harassment", "Harmful behavior")]
    for i, (code, label, desc) in enumerate(reports):
        m = _upsert_master(db, tenant_id, "report_reason", code, label, desc, i)
        master_map[f"report_reason:{code}"] = m.id

    return master_map


def seed_demo_users(db: Session, tenant_id: str) -> list[User]:
    users = []
    for email, pwd, name, username, verified, role, bio, idx in DEMO_USERS:
        users.append(_ensure_user(db, tenant_id, email, pwd, name, username, verified, role, bio, idx))
    return users


def seed_demo_content(db: Session, tenant: Tenant, users: list[User], master_map: dict):
    """Seed communities, events, posts, social graph — idempotent."""
    by_email = {u.email: u for u in users}

    # User skills
    skill_links = [
        (by_email.get("alex@thrivehub.com"), "skill:photography"),
        (by_email.get("dancer@thrivehub.com"), "skill:dance"),
        (by_email.get("comedian@thrivehub.com"), "skill:standup"),
        (by_email.get("lens@thrivehub.com"), "skill:photography"),
        (by_email.get("mia@thrivehub.com"), "skill:public_speaking"),
    ]
    for user, skill_key in skill_links:
        if not user:
            continue
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        skill_id = master_map.get(skill_key)
        if profile and skill_id:
            exists = db.query(UserSkill).filter(UserSkill.profile_id == profile.id, UserSkill.skill_id == skill_id).first()
            if not exists:
                db.add(UserSkill(profile_id=profile.id, skill_id=skill_id, level="advanced", years=3))

    communities_data = [
        (by_email.get("alex@thrivehub.com"), "Trail Blazers", "trail-blazers",
         "Hiking, trekking and outdoor adventure enthusiasts",
         "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200", "adventure",
         [by_email.get("sam@thrivehub.com"), by_email.get("jordan@thrivehub.com")]),
        (by_email.get("sam@thrivehub.com"), "City Runners Club", "city-runners",
         "Running community for all paces — from 5K to ultra",
         "https://images.unsplash.com/photo-1476480862128-209bfaa8edc8?w=1200", "sports",
         [by_email.get("riley@thrivehub.com")]),
        (by_email.get("dancer@thrivehub.com"), "Dance Collective", "dance-collective",
         "Salsa, hip-hop, contemporary — all styles welcome!",
         "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1200", "dance",
         [by_email.get("mia@thrivehub.com")]),
        (by_email.get("comedian@thrivehub.com"), "Open Mic Society", "open-mic-society",
         "Standup, improv, and comedy writing workshops",
         "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200", "comedy",
         [by_email.get("alex@thrivehub.com")]),
        (by_email.get("chef@thrivehub.com"), "Kitchen Creators", "kitchen-creators",
         "Share recipes, host cook-offs, and explore world cuisines",
         "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200", "food",
         [by_email.get("art@thrivehub.com")]),
        (by_email.get("lens@thrivehub.com"), "Shutterbugs United", "shutterbugs-united",
         "Street photography, golden hour walks, and gear talk",
         "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200", "arts",
         [by_email.get("art@thrivehub.com")]),
        (by_email.get("riley@thrivehub.com"), "Fitness Warriors", "fitness-warriors",
         "CrossFit, HIIT, yoga — sweat together, grow together",
         "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200", "fitness",
         [by_email.get("jordan@thrivehub.com")]),
    ]
    comm_map: dict[str, Community] = {}
    for owner, name, slug, desc, cover, cat, members in communities_data:
        if not owner:
            continue
        c = _ensure_community(db, tenant, owner, name, slug, desc, cover, cat, master_map,
                              [m for m in (members or []) if m])
        if c:
            comm_map[slug] = c

    events_data = [
        (by_email.get("alex@thrivehub.com"), "Weekend Trail Run", "10K trail run through scenic routes. Bring water and good shoes!",
         "Golden Gate Park", "https://images.unsplash.com/photo-1476480862128-209bfaa8edc8?w=1200", 7, 50, "meetup"),
        (by_email.get("sam@thrivehub.com"), "Rock Climbing Workshop", "Beginner-friendly climbing session with certified instructors.",
         "Vertical World Gym", "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1200", 14, 20, "workshop"),
        (by_email.get("dancer@thrivehub.com"), "Salsa Night Workshop", "Learn basic salsa steps then social dance all evening!",
         "Rhythm Studio Downtown", "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1200", 5, 40, "workshop"),
        (by_email.get("comedian@thrivehub.com"), "Open Mic Comedy Night", "5-minute sets welcome — first-timers encouraged!",
         "The Laugh Loft", "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200", 10, 80, "meetup"),
        (by_email.get("riley@thrivehub.com"), "Morning Yoga in the Park", "Sunrise flow session for all levels. Bring your mat!",
         "Central Park Meadow", "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200", 3, 30, "meetup"),
        (by_email.get("lens@thrivehub.com"), "Golden Hour Photo Walk", "Capture cityscapes at magic hour with fellow photographers.",
         "Waterfront Pier", "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200", 6, 25, "workshop"),
        (by_email.get("chef@thrivehub.com"), "Community Potluck Cook-off", "Bring your best dish — judges crown the People's Choice!",
         "Community Center Hall", "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200", 12, 60, "meetup"),
    ]
    for organiser, title, desc, venue, img, days, cap, etype in events_data:
        if organiser:
            dance_comm = comm_map.get("dance-collective")
            comm_id = dance_comm.id if "Salsa" in title and dance_comm else None
            _ensure_event(db, tenant, organiser, title, desc, venue, img, days, cap, etype, master_map, comm_id)

    posts_data = [
        (by_email.get("alex@thrivehub.com"), "Just completed my first marathon! 26.2 miles of pure determination. Who's joining me for the next one?",
         PostType.achievement, "https://images.unsplash.com/photo-1452626038306-9d505387a3a8?w=800"),
        (by_email.get("sam@thrivehub.com"), "Sunrise hike at Mount Tam was absolutely breathtaking today. Nature therapy at its finest.",
         PostType.image, "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"),
        (by_email.get("jordan@thrivehub.com"), "Hosting a weekend football meetup! All skill levels welcome. DM me for details.",
         PostType.text, None),
        (by_email.get("dancer@thrivehub.com"), "Salsa workshop was FIRE last night! 30 new dancers on the floor. Who's coming to the next one?",
         PostType.image, "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800"),
        (by_email.get("comedian@thrivehub.com"), "Killed it at open mic tonight — got a standing ovation on my closer about airport security 😂",
         PostType.text, None),
        (by_email.get("comedian@thrivehub.com"), "Writing new material. What's the worst date you've ever been on? Need inspiration!",
         PostType.image, "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800"),
        (by_email.get("mia@thrivehub.com"), "Dropped a new acoustic cover on my profile — feedback welcome from fellow musicians!",
         PostType.image, "https://images.unsplash.com/photo-1511379938543-c1f69419868d?w=800"),
        (by_email.get("chef@thrivehub.com"), "Korean BBQ night at home! Marinated galbi for 24 hours — recipe in comments.",
         PostType.image, "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800"),
        (by_email.get("lens@thrivehub.com"), "Golden hour at the waterfront never disappoints. Swipe for the full series.",
         PostType.image, "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800"),
        (by_email.get("riley@thrivehub.com"), "PR day! Deadlift 405lbs. Consistency beats motivation every single time.",
         PostType.achievement, "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800"),
        (by_email.get("art@thrivehub.com"), "Finished my latest mural commission — bold colors, big energy. What do you think?",
         PostType.image, "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800"),
        (by_email.get("alex@thrivehub.com"), "New personal best on the climbing wall today! Progress feels amazing.",
         PostType.achievement, "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800"),
    ]
    posts = []
    dance_comm = comm_map.get("dance-collective")
    for author, body, ptype, img in posts_data:
        if not author:
            continue
        comm_id = dance_comm.id if author.email == "dancer@thrivehub.com" and dance_comm else None
        p = _ensure_post(db, tenant, author, body, ptype, img, comm_id)
        if p:
            posts.append(p)

    # Social graph (idempotent via existence checks)
    follow_pairs = [
        (by_email.get("alex@thrivehub.com"), by_email.get("sam@thrivehub.com")),
        (by_email.get("sam@thrivehub.com"), by_email.get("alex@thrivehub.com")),
        (by_email.get("jordan@thrivehub.com"), by_email.get("alex@thrivehub.com")),
        (by_email.get("dancer@thrivehub.com"), by_email.get("mia@thrivehub.com")),
        (by_email.get("comedian@thrivehub.com"), by_email.get("alex@thrivehub.com")),
        (by_email.get("lens@thrivehub.com"), by_email.get("art@thrivehub.com")),
        (by_email.get("chef@thrivehub.com"), by_email.get("dancer@thrivehub.com")),
    ]
    for follower, following in follow_pairs:
        if not follower or not following:
            continue
        exists = db.query(Follow).filter(Follow.follower_id == follower.id, Follow.following_id == following.id).first()
        if not exists:
            db.add(Follow(follower_id=follower.id, following_id=following.id, status=FollowStatus.accepted))

    # Comments & reactions on first post
    if posts:
        first = posts[0]
        if not db.query(Comment).filter(Comment.post_id == first.id).first():
            sam = by_email.get("sam@thrivehub.com")
            jordan = by_email.get("jordan@thrivehub.com")
            if sam:
                db.add(Comment(post_id=first.id, author_id=sam.id, body="Incredible achievement! Congratulations!"))
            if jordan:
                db.add(Comment(post_id=first.id, author_id=jordan.id, body="So inspiring! What's your training plan?"))
        for reactor_email in ["sam@thrivehub.com", "jordan@thrivehub.com", "dancer@thrivehub.com"]:
            reactor = by_email.get(reactor_email)
            if reactor and not db.query(Reaction).filter(Reaction.actor_id == reactor.id, Reaction.post_id == first.id).first():
                rtype = "celebrate" if reactor_email == "jordan@thrivehub.com" else "like"
                db.add(Reaction(actor_id=reactor.id, post_id=first.id, reaction_type=rtype))

    # DM conversation
    alex, sam = by_email.get("alex@thrivehub.com"), by_email.get("sam@thrivehub.com")
    if alex and sam and not db.query(Conversation).filter(Conversation.tenant_id == tenant.id).first():
        conv = Conversation(tenant_id=tenant.id, type=ConversationType.direct, created_by=alex.id)
        db.add(conv)
        db.flush()
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=alex.id))
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=sam.id))
        db.add(Message(conversation_id=conv.id, sender_id=alex.id, body="Hey Sam! Are you joining the trail run next week?"))
        db.add(Message(conversation_id=conv.id, sender_id=sam.id, body="Absolutely! Count me in. What time should we meet?"))

    # Notifications
    if alex and not db.query(Notification).filter(Notification.user_id == alex.id).first():
        db.add(Notification(tenant_id=tenant.id, user_id=alex.id, type=NotificationType.like,
                            title="New like", body="Sam Chen liked your post"))
        db.add(Notification(tenant_id=tenant.id, user_id=alex.id, type=NotificationType.follow,
                            title="New follower", body="Jordan Lee started following you"))
        db.add(Notification(tenant_id=tenant.id, user_id=alex.id, type=NotificationType.event,
                            title="Event reminder", body="Weekend Trail Run is coming up in 7 days"))


def seed_database():
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        if tenant:
            seed_supplemental(db, tenant=tenant)
            return

        tenant = Tenant(code="thrivehub", name="ThriveHub", status="active")
        db.add(tenant)
        db.flush()

        master_map = seed_platform_masters(db, tenant.id)
        users = seed_demo_users(db, tenant.id)
        seed_demo_content(db, tenant, users, master_map)
        seed_rich_profiles(db, tenant.id, master_map, users)
        seed_supplemental(db, tenant=tenant, users=users, master_map=master_map)
        db.commit()
        print("Database seeded successfully.")
    finally:
        db.close()


def seed_supplemental(db: Session, tenant=None, users=None, master_map=None):
    """Idempotent supplemental seed — runs on fresh DB or supplements existing."""
    if tenant is None:
        tenant = db.query(Tenant).first()
    if not tenant:
        return

    master_map = master_map or {
        f"{m.master_type}:{m.code}": m.id
        for m in db.query(MasterValue).filter(MasterValue.tenant_id == tenant.id).all()
    }
    if not master_map.get("skill_category:dance"):
        master_map = seed_platform_masters(db, tenant.id)

    users = users or seed_demo_users(db, tenant.id)
    seed_demo_content(db, tenant, users, master_map)
    seed_rich_profiles(db, tenant.id, master_map, users)

    if not db.query(SubscriptionTier).filter(SubscriptionTier.tenant_id == tenant.id).first():
        tiers = [
            SubscriptionTier(
                tenant_id=tenant.id, code="free", name="Free", description="Basic community access",
                price_monthly=0, price_yearly=0,
                features_json=json.dumps(["posts", "communities", "events"]), sort_order=0,
            ),
            SubscriptionTier(
                tenant_id=tenant.id, code="pro", name="Pro", description="Enhanced features for active members",
                price_monthly=999, price_yearly=9990,
                features_json=json.dumps(["posts", "communities", "events", "analytics", "priority_support"]),
                sort_order=1,
            ),
            SubscriptionTier(
                tenant_id=tenant.id, code="elite", name="Elite", description="Premium tier for power users",
                price_monthly=1999, price_yearly=19990,
                features_json=json.dumps(["all_pro", "verified_badge", "sponsored_posts", "ai_insights"]),
                sort_order=2,
            ),
        ]
        for t in tiers:
            db.add(t)
        db.flush()

    alex = next((u for u in users if u.email == "alex@thrivehub.com"), None)
    if alex:
        pro_tier = db.query(SubscriptionTier).filter(SubscriptionTier.code == "pro", SubscriptionTier.tenant_id == tenant.id).first()
        if pro_tier and not db.query(UserSubscription).filter(UserSubscription.user_id == alex.id).first():
            db.add(UserSubscription(user_id=alex.id, tier_id=pro_tier.id, status="active"))

    # Sponsorships
    sponsors = [
        ("Trail Gear Co.", "Trail Gear Co.", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
         "https://example.com/trailgear", "feed_banner", 0),
        ("Peak Performance", "Peak Performance", "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800",
         "https://example.com/peak", "sidebar", 1),
        ("Rhythm Dancewear", "Rhythm Dancewear", "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800",
         "https://example.com/rhythm", "landing_banner", 0),
        ("Laugh Lab Comedy Club", "Laugh Lab", "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800",
         "https://example.com/laughlab", "landing_banner", 1),
    ]
    for title, sponsor_name, image_url, link_url, placement, sort_order in sponsors:
        exists = db.query(Sponsorship).filter(
            Sponsorship.tenant_id == tenant.id, Sponsorship.title == title,
        ).first()
        if not exists:
            db.add(Sponsorship(
                tenant_id=tenant.id, title=title, sponsor_name=sponsor_name,
                image_url=image_url, link_url=link_url, placement=placement, sort_order=sort_order,
            ))

    if not db.query(Report).filter(Report.tenant_id == tenant.id).first() and len(users) > 2:
        first_post = db.query(Post).filter(Post.tenant_id == tenant.id).first()
        if first_post:
            spam_reason = master_map.get("report_reason:spam")
            db.add(Report(
                tenant_id=tenant.id, reporter_id=users[2].id, target_type="post",
                target_id=first_post.id,
                reason_id=spam_reason, description="This looks like spam content", status="open", priority="normal",
            ))

    if not db.query(AiModerationFlag).filter(AiModerationFlag.tenant_id == tenant.id).first():
        first_post = db.query(Post).filter(Post.tenant_id == tenant.id).first()
        if first_post:
            db.add(AiModerationFlag(
                tenant_id=tenant.id, target_type="post", target_id=first_post.id,
                confidence=45, categories_json=json.dumps(["low_risk"]), flagged_by="system", status="pending",
            ))

    if not db.query(AuditLog).filter(AuditLog.tenant_id == tenant.id).first() and users:
        admin = next((u for u in users if u.role == "admin"), users[0])
        db.add(AuditLog(
            tenant_id=tenant.id, actor_id=admin.id, action="system_startup",
            entity_type="system", details_json=json.dumps({"event": "seed_complete"}),
        ))

    db.commit()
    print("Supplemental demo data seeded.")


if __name__ == "__main__":
    seed_database()
