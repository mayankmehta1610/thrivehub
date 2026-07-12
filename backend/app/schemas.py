from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, EmailStr, Field

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


class RefreshRequest(BaseModel):
    refresh_token: str


class ProfileBase(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    cover_url: str | None = None
    location: str | None = None
    website: str | None = None


class ProfileUpdate(ProfileBase):
    pass


class ProfileOut(ProfileBase):
    id: str
    user_id: str
    username: str
    is_verified: bool
    created_at: datetime

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

    model_config = {"from_attributes": True}


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


class PostUpdate(BaseModel):
    body: str | None = None
    audience: str | None = None
    image_url: str | None = None


class AuthorBrief(BaseModel):
    id: str
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class PostOut(BaseModel):
    id: str
    author_id: str
    community_id: str | None
    type: str
    body: str
    audience: str
    status: str
    image_url: str | None
    created_at: datetime
    author: AuthorBrief | None = None
    reaction_count: int = 0
    comment_count: int = 0
    user_reacted: bool = False

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    body: str = Field(min_length=1)
    parent_id: str | None = None


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

    model_config = {"from_attributes": True}


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


class PlatformConfigOut(BaseModel):
    app_name: str
    tagline: str
    hero_image: str
    primary_color: str
    secondary_color: str
    accent_color: str
    features: list[dict]
