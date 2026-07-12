import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class UserStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    pending = "pending"


class PostType(str, enum.Enum):
    text = "text"
    image = "image"
    video = "video"
    achievement = "achievement"
    event = "event"


class PostAudience(str, enum.Enum):
    public = "public"
    followers = "followers"
    community = "community"
    private = "private"


class CommunityVisibility(str, enum.Enum):
    public = "public"
    private = "private"
    hidden = "hidden"


class MembershipRole(str, enum.Enum):
    member = "member"
    moderator = "moderator"
    admin = "admin"


class MembershipStatus(str, enum.Enum):
    active = "active"
    pending = "pending"
    banned = "banned"


class FollowStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"


class ConversationType(str, enum.Enum):
    direct = "direct"
    group = "group"


class NotificationType(str, enum.Enum):
    like = "like"
    comment = "comment"
    follow = "follow"
    message = "message"
    event = "event"
    community = "community"
    system = "system"


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="active")
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    users: Mapped[list["User"]] = relationship(back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    mobile: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus), default=UserStatus.active)
    role: Mapped[str] = mapped_column(String(32), default="member")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    tenant: Mapped["Tenant"] = relationship(back_populates="users")
    profile: Mapped["Profile | None"] = relationship(back_populates="user", uselist=False)
    posts: Mapped[list["Post"]] = relationship(back_populates="author")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")

    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_tenant_email"),)


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(64), index=True)
    display_name: Mapped[str] = mapped_column(String(128))
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship(back_populates="profile")
    skills: Mapped[list["UserSkill"]] = relationship(back_populates="profile", cascade="all, delete-orphan")


class MasterValue(Base):
    __tablename__ = "master_values"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    master_type: Mapped[str] = mapped_column(String(64), index=True)
    code: Mapped[str] = mapped_column(String(64))
    label: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "master_type", "code", name="uq_master_code"),)


class UserSkill(Base):
    __tablename__ = "user_skills"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), index=True)
    skill_id: Mapped[str] = mapped_column(ForeignKey("master_values.id"), index=True)
    level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)

    profile: Mapped["Profile"] = relationship(back_populates="skills")
    skill: Mapped["MasterValue"] = relationship()


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    community_id: Mapped[str | None] = mapped_column(ForeignKey("communities.id"), nullable=True, index=True)
    type: Mapped[PostType] = mapped_column(Enum(PostType), default=PostType.text)
    body: Mapped[str] = mapped_column(Text)
    audience: Mapped[PostAudience] = mapped_column(Enum(PostAudience), default=PostAudience.public)
    status: Mapped[str] = mapped_column(String(32), default="published")
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    author: Mapped["User"] = relationship(back_populates="posts")
    community: Mapped["Community | None"] = relationship(back_populates="posts")
    comments: Mapped[list["Comment"]] = relationship(back_populates="post", cascade="all, delete-orphan")
    reactions: Mapped[list["Reaction"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
        foreign_keys="Reaction.post_id",
    )


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    post_id: Mapped[str] = mapped_column(ForeignKey("posts.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("comments.id"), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    post: Mapped["Post"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship()
    reactions: Mapped[list["Reaction"]] = relationship(
        back_populates="comment",
        cascade="all, delete-orphan",
        foreign_keys="Reaction.comment_id",
    )


class Reaction(Base):
    __tablename__ = "reactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    post_id: Mapped[str | None] = mapped_column(ForeignKey("posts.id"), nullable=True, index=True)
    comment_id: Mapped[str | None] = mapped_column(ForeignKey("comments.id"), nullable=True, index=True)
    reaction_type: Mapped[str] = mapped_column(String(32), default="like")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    post: Mapped["Post | None"] = relationship(back_populates="reactions", foreign_keys=[post_id])
    comment: Mapped["Comment | None"] = relationship(back_populates="reactions", foreign_keys=[comment_id])
    actor: Mapped["User"] = relationship()

    __table_args__ = (
        UniqueConstraint("actor_id", "post_id", name="uq_actor_post_reaction"),
        UniqueConstraint("actor_id", "comment_id", name="uq_actor_comment_reaction"),
    )


class Community(Base):
    __tablename__ = "communities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(128), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("master_values.id"), nullable=True)
    visibility: Mapped[CommunityVisibility] = mapped_column(Enum(CommunityVisibility), default=CommunityVisibility.public)
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped["User"] = relationship()
    category: Mapped["MasterValue | None"] = relationship()
    members: Mapped[list["CommunityMember"]] = relationship(back_populates="community", cascade="all, delete-orphan")
    posts: Mapped[list["Post"]] = relationship(back_populates="community")

    __table_args__ = (UniqueConstraint("tenant_id", "slug", name="uq_tenant_community_slug"),)


class CommunityMember(Base):
    __tablename__ = "community_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    community_id: Mapped[str] = mapped_column(ForeignKey("communities.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[MembershipRole] = mapped_column(Enum(MembershipRole), default=MembershipRole.member)
    status: Mapped[MembershipStatus] = mapped_column(Enum(MembershipStatus), default=MembershipStatus.active)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    community: Mapped["Community"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()

    __table_args__ = (UniqueConstraint("community_id", "user_id", name="uq_community_member"),)


class Follow(Base):
    __tablename__ = "follows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    follower_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    following_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[FollowStatus] = mapped_column(Enum(FollowStatus), default=FollowStatus.accepted)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    follower: Mapped["User"] = relationship(foreign_keys=[follower_id])
    following: Mapped["User"] = relationship(foreign_keys=[following_id])

    __table_args__ = (UniqueConstraint("follower_id", "following_id", name="uq_follow"),)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    organiser_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    community_id: Mapped[str | None] = mapped_column(ForeignKey("communities.id"), nullable=True)
    event_type_id: Mapped[str | None] = mapped_column(ForeignKey("master_values.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    venue: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="scheduled")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    organiser: Mapped["User"] = relationship()
    event_type: Mapped["MasterValue | None"] = relationship()
    participants: Mapped[list["EventParticipant"]] = relationship(back_populates="event", cascade="all, delete-orphan")


class EventParticipant(Base):
    __tablename__ = "event_participants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="registered")
    checkin_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    event: Mapped["Event"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship()

    __table_args__ = (UniqueConstraint("event_id", "user_id", name="uq_event_participant"),)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    type: Mapped[ConversationType] = mapped_column(Enum(ConversationType), default=ConversationType.direct)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(32), default="active")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    participants: Mapped[list["ConversationParticipant"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    conversation: Mapped["Conversation"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship()

    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_conversation_participant"),)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), index=True)
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="sent")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship()


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    user: Mapped["User"] = relationship(back_populates="notifications")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_type: Mapped[str] = mapped_column(String(32))
    target_id: Mapped[str] = mapped_column(String(36))
    reason_id: Mapped[str | None] = mapped_column(ForeignKey("master_values.id"), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    reporter: Mapped["User"] = relationship()
    reason: Mapped["MasterValue | None"] = relationship()
