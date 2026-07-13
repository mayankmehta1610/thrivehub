from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, EmailStr, Field, field_validator

T = TypeVar("T")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str = Field(min_length=2, max_length=128)
    username: str = Field(min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_]+$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    otp: str | None = None  # two-factor code, required when 2FA is enabled


class RefreshRequest(BaseModel):
    refresh_token: str


class TwoFactorSetupOut(BaseModel):
    secret: str
    otpauth_uri: str


class TwoFactorVerify(BaseModel):
    code: str


class TwoFactorStatus(BaseModel):
    enabled: bool


class ProfileBase(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    cover_url: str | None = None
    location: str | None = None
    website: str | None = None


class ProfileUpdate(ProfileBase):
    pass


class UserSkillOut(BaseModel):
    id: str
    code: str
    label: str
    level: str | None = None
    years: int | None = None
    image_url: str | None = None

    model_config = {"from_attributes": True}


class ProfilePhotoOut(BaseModel):
    id: str
    url: str
    caption: str | None = None
    sort_order: int = 0

    model_config = {"from_attributes": True}


class ProfilePhotoCreate(BaseModel):
    url: str = Field(min_length=1, max_length=512)
    caption: str | None = Field(default=None, max_length=255)
    sort_order: int = 0


class ProfileOut(ProfileBase):
    id: str
    user_id: str
    username: str
    is_verified: bool
    created_at: datetime
    skills: list[UserSkillOut] = []
    photos: list[ProfilePhotoOut] = []
    follower_count: int = 0
    following_count: int = 0
    post_count: int = 0

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id: str
    email: str
    status: str
    role: str
    created_at: datetime
    profile: ProfileOut | None = None

    model_config = {"from_attributes": True}


class MasterValueOut(BaseModel):
    id: str
    master_type: str
    code: str
    label: str
    description: str | None = None
    status: str
    sort_order: int
    image_url: str | None = None

    model_config = {"from_attributes": True}


class SkillCategoryItem(BaseModel):
    code: str
    label: str
    description: str | None = None
    image_url: str | None = None


class FeaturedCommunityItem(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    cover_url: str | None = None
    member_count: int = 0


class FeaturedEventItem(BaseModel):
    id: str
    title: str
    description: str | None = None
    venue: str | None = None
    image_url: str | None = None
    start_at: datetime
    participant_count: int = 0


class FeaturedPostItem(BaseModel):
    id: str
    body: str
    image_url: str | None = None
    author_name: str | None = None
    author_avatar: str | None = None


class SponsorshipBrief(BaseModel):
    id: str
    title: str
    sponsor_name: str
    image_url: str | None = None
    link_url: str | None = None
    placement: str


class MasterValueCreate(BaseModel):
    master_type: str
    code: str
    label: str
    description: str | None = None
    sort_order: int = 0


class PostCreate(BaseModel):
    body: str = Field(min_length=1)
    type: str = "text"
    audience: str = "public"
    community_id: str | None = None
    image_url: str | None = None
    cross_post: list[str] = []  # provider codes to also publish to (must be connected)


class SocialConnectionOut(BaseModel):
    provider: str
    label: str | None = None
    connected: bool = False
    configured: bool = False  # whether live OAuth credentials are set for this provider
    external_username: str | None = None
    status: str | None = None  # connected | demo


class SocialConnectRequest(BaseModel):
    external_username: str | None = None


class PostUpdate(BaseModel):
    body: str | None = None
    audience: str | None = None
    image_url: str | None = None
    comments_enabled: bool | None = None


class AuthorBrief(BaseModel):
    id: str
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class ConnectionRequestOut(BaseModel):
    user: AuthorBrief | None = None
    created_at: datetime


class ConnectionStatusOut(BaseModel):
    status: str  # none | pending_outgoing | pending_incoming | connected
    connection_count: int = 0


class FeedbackCreate(BaseModel):
    category: str = "general"
    message: str = Field(min_length=1, max_length=4000)
    rating: int | None = None


class FeedbackOut(BaseModel):
    id: str
    category: str
    message: str
    rating: int | None = None
    status: str
    created_at: datetime
    user: AuthorBrief | None = None


class PostOut(BaseModel):
    id: str
    author_id: str
    community_id: str | None
    type: str
    body: str
    audience: str
    status: str
    image_url: str | None
    comments_enabled: bool = True
    created_at: datetime
    author: AuthorBrief | None = None
    like_count: int = 0
    dislike_count: int = 0
    reaction_count: int = 0
    comment_count: int = 0
    share_count: int = 0
    user_reacted: bool = False
    user_reaction_type: str | None = None

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    parent_id: str | None = None

    @field_validator("body")
    @classmethod
    def strip_body(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Comment cannot be empty")
        if len(v) > 2000:
            raise ValueError("Comment must be at most 2000 characters")
        return v


class CommentOut(BaseModel):
    id: str
    post_id: str
    author_id: str
    parent_id: str | None
    body: str
    created_at: datetime
    author: AuthorBrief | None = None
    reaction_count: int = 0

    model_config = {"from_attributes": True}


class ReactionCreate(BaseModel):
    reaction_type: str = "like"


class ReactionUserOut(BaseModel):
    id: str
    reaction_type: str
    created_at: datetime
    user: AuthorBrief | None = None

    model_config = {"from_attributes": True}


class ShareUserOut(BaseModel):
    id: str
    created_at: datetime
    user: AuthorBrief | None = None

    model_config = {"from_attributes": True}


class CommentUserOut(BaseModel):
    id: str
    body: str
    created_at: datetime
    user: AuthorBrief | None = None

    model_config = {"from_attributes": True}


class CommunityCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    slug: str = Field(min_length=2, max_length=128, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    cover_url: str | None = None
    category_id: str | None = None
    visibility: str = "public"


class CommunityOut(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None
    cover_url: str | None
    visibility: str
    status: str
    member_count: int = 0
    created_at: datetime
    owner: AuthorBrief | None = None
    is_member: bool = False
    my_role: str | None = None  # admin | moderator | member | None

    model_config = {"from_attributes": True}


class CommunityMemberOut(BaseModel):
    user: AuthorBrief | None = None
    role: str
    status: str


class CommunityMemberRoleUpdate(BaseModel):
    role: str  # admin | moderator | member


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    venue: str | None = None
    image_url: str | None = None
    start_at: datetime
    end_at: datetime | None = None
    capacity: int | None = None
    event_type_id: str | None = None
    community_id: str | None = None


class EventOut(BaseModel):
    id: str
    title: str
    description: str | None
    venue: str | None
    image_url: str | None
    start_at: datetime
    end_at: datetime | None
    capacity: int | None
    status: str
    participant_count: int = 0
    organiser: AuthorBrief | None = None
    is_registered: bool = False

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    body: str = Field(min_length=1)


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    body: str
    status: str
    created_at: datetime
    sender: AuthorBrief | None = None

    model_config = {"from_attributes": True}


class ConversationCreate(BaseModel):
    participant_ids: list[str] = Field(min_length=1)
    title: str | None = None
    type: str = "direct"


class ConversationOut(BaseModel):
    id: str
    type: str
    title: str | None
    updated_at: datetime
    participants: list[AuthorBrief] = []
    last_message: MessageOut | None = None

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: str
    link: str | None = None
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportCreate(BaseModel):
    target_type: str
    target_id: str
    reason_id: str | None = None
    description: str | None = None


class SearchResult(BaseModel):
    entity_type: str
    id: str
    title: str
    subtitle: str | None = None
    image_url: str | None = None


class UploadLimits(BaseModel):
    image_max_bytes: int = 512000
    video_max_bytes: int = 2097152
    audio_max_bytes: int = 5242880


class PlatformConfigOut(BaseModel):
    app_name: str
    tagline: str
    hero_image: str
    hero_subtitle: str | None = None
    primary_color: str
    secondary_color: str
    accent_color: str
    features: list[dict]
    skill_categories: list[SkillCategoryItem] = []
    featured_communities: list[FeaturedCommunityItem] = []
    featured_events: list[FeaturedEventItem] = []
    featured_posts: list[FeaturedPostItem] = []
    sponsorships: list[SponsorshipBrief] = []
    stats: dict = {}
    upload_limits: UploadLimits = UploadLimits()


class ReportOut(BaseModel):
    id: str
    reporter_id: str
    target_type: str
    target_id: str
    reason_id: str | None
    description: str | None
    status: str
    priority: str
    resolution_notes: str | None
    created_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


class ReportResolve(BaseModel):
    status: str = Field(pattern="^(resolved|dismissed|reviewing)$")
    resolution_notes: str | None = None
    action: str | None = None


class AppealCreate(BaseModel):
    moderation_action_id: str | None = None
    report_id: str | None = None
    reason: str = Field(min_length=10)


class AppealOut(BaseModel):
    id: str
    appellant_id: str
    moderation_action_id: str | None
    report_id: str | None
    reason: str
    status: str
    review_notes: str | None
    created_at: datetime
    reviewed_at: datetime | None

    model_config = {"from_attributes": True}


class AppealReview(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
    review_notes: str | None = None


class ModerationActionCreate(BaseModel):
    report_id: str | None = None
    target_type: str
    target_id: str
    action: str
    reason: str | None = None


class ModerationActionOut(BaseModel):
    id: str
    moderator_id: str
    report_id: str | None
    target_type: str
    target_id: str
    action: str
    reason: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: str
    actor_id: str
    action: str
    entity_type: str
    entity_id: str | None
    details_json: str | None
    ip_address: str | None
    created_at: datetime
    actor: AuthorBrief | None = None

    model_config = {"from_attributes": True}


class SubscriptionTierOut(BaseModel):
    id: str
    code: str
    name: str
    description: str | None
    price_monthly: int
    price_yearly: int
    features_json: str | None
    status: str
    sort_order: int

    model_config = {"from_attributes": True}


class SponsorshipOut(BaseModel):
    id: str
    title: str
    sponsor_name: str
    image_url: str | None
    link_url: str | None
    placement: str
    status: str
    sort_order: int

    model_config = {"from_attributes": True}


class AiFlagCreate(BaseModel):
    target_type: str
    target_id: str
    confidence: int = Field(ge=0, le=100)
    categories: list[str] = []


class AiFlagOut(BaseModel):
    id: str
    target_type: str
    target_id: str
    confidence: int
    categories_json: str | None
    flagged_by: str
    status: str
    review_notes: str | None
    created_at: datetime
    reviewed_at: datetime | None

    model_config = {"from_attributes": True}


class AiFlagReview(BaseModel):
    status: str = Field(pattern="^(reviewed|dismissed)$")
    review_notes: str | None = None


class DeviceTokenCreate(BaseModel):
    platform: str = Field(pattern="^(android|ios|web)$")
    token: str = Field(min_length=10)
