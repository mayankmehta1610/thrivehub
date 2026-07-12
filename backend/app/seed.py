import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    AiModerationFlag,
    Appeal,
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


def seed_database():
    db = SessionLocal()
    try:
        if db.query(Tenant).first():
            seed_supplemental(db)
            return
        tenant = Tenant(code="thrivehub", name="ThriveHub", status="active")
        db.add(tenant)
        db.flush()

        platform_masters = [
            ("platform_config", "app_name", "ThriveHub", "Community platform brand name"),
            ("platform_config", "tagline", "Showcase skills, sports & adventure", "Hero tagline"),
            ("platform_config", "hero_image", "https://images.unsplash.com/photo-1517649763962-0c62306601b7?w=1600", None),
            ("platform_config", "primary_color", "#6366F1", None),
            ("platform_config", "secondary_color", "#EC4899", None),
            ("platform_config", "accent_color", "#14B8A6", None),
            ("feature", "profiles", "Rich Profiles", "Showcase skills, sports and achievements"),
            ("feature", "communities", "Communities", "Join groups around your passions"),
            ("feature", "events", "Events", "Discover sports and adventure events"),
            ("feature", "messaging", "Messaging", "Connect with friends and groups"),
            ("skill", "photography", "Photography", "Visual storytelling"),
            ("skill", "coaching", "Coaching", "Training and mentoring"),
            ("skill", "public_speaking", "Public Speaking", "Communication skills"),
            ("sport", "football", "Football", "Team sport"),
            ("sport", "running", "Running", "Endurance sport"),
            ("sport", "yoga", "Yoga", "Mind-body wellness"),
            ("adventure", "hiking", "Hiking", "Trail adventures"),
            ("adventure", "climbing", "Rock Climbing", "Vertical adventures"),
            ("event_type", "meetup", "Meetup", "Community gathering"),
            ("event_type", "tournament", "Tournament", "Competitive event"),
            ("community_category", "sports", "Sports", "Sports communities"),
            ("community_category", "adventure", "Adventure", "Outdoor enthusiasts"),
            ("reaction", "like", "Like", "Appreciation"),
            ("reaction", "celebrate", "Celebrate", "Achievement celebration"),
            ("report_reason", "spam", "Spam", "Unwanted content"),
            ("report_reason", "harassment", "Harassment", "Harmful behavior"),
        ]
        master_map = {}
        for i, (mtype, code, label, desc) in enumerate(platform_masters):
            m = MasterValue(
                tenant_id=tenant.id,
                master_type=mtype,
                code=code,
                label=label,
                description=desc,
                sort_order=i,
            )
            db.add(m)
            db.flush()
            master_map[f"{mtype}:{code}"] = m.id

        users_data = [
            ("admin@thrivehub.com", "admin123", "Admin User", "admin", True, "admin"),
            ("alex@thrivehub.com", "demo1234", "Alex Rivera", "alexrivera", True, "member"),
            ("sam@thrivehub.com", "demo1234", "Sam Chen", "samchen", False, "member"),
            ("jordan@thrivehub.com", "demo1234", "Jordan Lee", "jordanlee", True, "member"),
        ]
        avatars = [
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
        ]
        covers = [
            "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200",
            "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200",
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
        ]
        users = []
        for i, (email, pwd, name, username, verified, role) in enumerate(users_data):
            u = User(
                tenant_id=tenant.id,
                email=email,
                password_hash=hash_password(pwd),
                status=UserStatus.active,
                role=role,
            )
            db.add(u)
            db.flush()
            p = Profile(
                user_id=u.id,
                username=username,
                display_name=name,
                bio=f"Passionate about skills, sports and adventure. Welcome to my ThriveHub profile!",
                avatar_url=avatars[i],
                cover_url=covers[i],
                location=["San Francisco, CA", "Austin, TX", "Denver, CO", "Seattle, WA"][i],
                is_verified=verified,
            )
            db.add(p)
            users.append(u)

        profile1 = db.query(Profile).filter(Profile.user_id == users[1].id).first()
        db.add(UserSkill(profile_id=profile1.id, skill_id=master_map["skill:photography"], level="advanced", years=5))
        db.flush()

        posts_data = [
            (users[1], "Just completed my first marathon! 26.2 miles of pure determination. Who's joining me for the next one?", PostType.achievement, "https://images.unsplash.com/photo-1452626038306-9d505387a3a8?w=800"),
            (users[2], "Sunrise hike at Mount Tam was absolutely breathtaking today. Nature therapy at its finest.", PostType.image, "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"),
            (users[3], "Hosting a weekend football meetup! All skill levels welcome. DM me for details.", PostType.text, None),
            (users[1], "New personal best on the climbing wall today! Progress feels amazing.", PostType.achievement, "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800"),
        ]
        posts = []
        for author, body, ptype, img in posts_data:
            post = Post(
                tenant_id=tenant.id,
                author_id=author.id,
                body=body,
                type=ptype,
                audience=PostAudience.public,
                image_url=img,
            )
            db.add(post)
            db.flush()
            posts.append(post)

        db.add(Comment(post_id=posts[0].id, author_id=users[2].id, body="Incredible achievement! Congratulations!"))
        db.add(Comment(post_id=posts[0].id, author_id=users[3].id, body="So inspiring! What's your training plan?"))
        db.add(Reaction(actor_id=users[2].id, post_id=posts[0].id, reaction_type="like"))
        db.add(Reaction(actor_id=users[3].id, post_id=posts[0].id, reaction_type="celebrate"))
        db.add(Reaction(actor_id=users[1].id, post_id=posts[1].id, reaction_type="like"))

        db.add(Follow(follower_id=users[1].id, following_id=users[2].id, status=FollowStatus.accepted))
        db.add(Follow(follower_id=users[2].id, following_id=users[1].id, status=FollowStatus.accepted))
        db.add(Follow(follower_id=users[3].id, following_id=users[1].id, status=FollowStatus.accepted))

        communities = [
            Community(
                tenant_id=tenant.id,
                owner_id=users[1].id,
                name="Trail Blazers",
                slug="trail-blazers",
                description="Hiking, trekking and outdoor adventure enthusiasts",
                cover_url="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200",
                category_id=master_map["community_category:adventure"],
                visibility=CommunityVisibility.public,
            ),
            Community(
                tenant_id=tenant.id,
                owner_id=users[2].id,
                name="City Runners Club",
                slug="city-runners",
                description="Running community for all paces — from 5K to ultra",
                cover_url="https://images.unsplash.com/photo-1476480862128-209bfaa8edc8?w=1200",
                category_id=master_map["community_category:sports"],
                visibility=CommunityVisibility.public,
            ),
        ]
        for c in communities:
            db.add(c)
            db.flush()
            db.add(CommunityMember(community_id=c.id, user_id=c.owner_id, role=MembershipRole.admin, status=MembershipStatus.active))
            db.add(CommunityMember(community_id=c.id, user_id=users[3].id, role=MembershipRole.member, status=MembershipStatus.active))

        now = datetime.now(timezone.utc)
        events = [
            Event(
                tenant_id=tenant.id,
                organiser_id=users[1].id,
                title="Weekend Trail Run",
                description="10K trail run through scenic routes. Bring water and good shoes!",
                venue="Golden Gate Park",
                image_url="https://images.unsplash.com/photo-1476480862128-209bfaa8edc8?w=1200",
                start_at=now + timedelta(days=7),
                capacity=50,
                event_type_id=master_map["event_type:meetup"],
            ),
            Event(
                tenant_id=tenant.id,
                organiser_id=users[2].id,
                title="Rock Climbing Workshop",
                description="Beginner-friendly climbing session with certified instructors.",
                venue="Vertical World Gym",
                image_url="https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1200",
                start_at=now + timedelta(days=14),
                capacity=20,
                event_type_id=master_map["event_type:tournament"],
            ),
        ]
        for e in events:
            db.add(e)
            db.flush()
            db.add(EventParticipant(event_id=e.id, user_id=users[1].id))

        conv = Conversation(tenant_id=tenant.id, type=ConversationType.direct, created_by=users[1].id)
        db.add(conv)
        db.flush()
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=users[1].id))
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=users[2].id))
        db.add(Message(conversation_id=conv.id, sender_id=users[1].id, body="Hey Sam! Are you joining the trail run next week?"))
        db.add(Message(conversation_id=conv.id, sender_id=users[2].id, body="Absolutely! Count me in. What time should we meet?"))

        notifications = [
            Notification(tenant_id=tenant.id, user_id=users[1].id, type=NotificationType.like, title="New like", body="Sam Chen liked your post"),
            Notification(tenant_id=tenant.id, user_id=users[1].id, type=NotificationType.follow, title="New follower", body="Jordan Lee started following you"),
            Notification(tenant_id=tenant.id, user_id=users[1].id, type=NotificationType.event, title="Event reminder", body="Weekend Trail Run is coming up in 7 days"),
        ]
        for n in notifications:
            db.add(n)

        seed_supplemental(db, tenant=tenant, users=users, master_map=master_map)
        db.commit()
        print("Database seeded successfully.")
    finally:
        db.close()


def seed_supplemental(db: Session, tenant=None, users=None, master_map=None):
    """Seed R3/R4 data — runs on fresh DB or supplements existing."""
    if tenant is None:
        tenant = db.query(Tenant).first()
    if not tenant:
        return
    if users is None:
        users = db.query(User).filter(User.tenant_id == tenant.id).all()
    if master_map is None:
        masters = db.query(MasterValue).filter(MasterValue.tenant_id == tenant.id).all()
        master_map = {f"{m.master_type}:{m.code}": m.id for m in masters}

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
        if len(users) > 1:
            pro_tier = db.query(SubscriptionTier).filter(SubscriptionTier.code == "pro", SubscriptionTier.tenant_id == tenant.id).first()
            if pro_tier:
                db.add(UserSubscription(user_id=users[1].id, tier_id=pro_tier.id, status="active"))

    if not db.query(Sponsorship).filter(Sponsorship.tenant_id == tenant.id).first():
        db.add(Sponsorship(
            tenant_id=tenant.id, title="Trail Gear Co.", sponsor_name="Trail Gear Co.",
            image_url="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
            link_url="https://example.com/trailgear", placement="feed_banner", sort_order=0,
        ))
        db.add(Sponsorship(
            tenant_id=tenant.id, title="Peak Performance", sponsor_name="Peak Performance",
            image_url="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800",
            link_url="https://example.com/peak", placement="sidebar", sort_order=1,
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
    print("Supplemental R3/R4 data seeded.")


if __name__ == "__main__":
    seed_database()
