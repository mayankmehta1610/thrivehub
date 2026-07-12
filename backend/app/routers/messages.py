from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import Conversation, ConversationParticipant, ConversationType, Message, Notification, NotificationType, User
from app.routers.posts import _author_brief
from app.schemas import ConversationCreate, ConversationOut, MessageCreate, MessageOut
from app.utils.pagination import PaginationParams, apply_pagination, paginated
from app.utils.push import send_push_to_user
from app.utils.trust import get_blocked_ids, is_blocked

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/conversations", response_model=dict)
def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size)
    blocked = get_blocked_ids(db, user.id)
    query = (
        db.query(Conversation)
        .join(ConversationParticipant)
        .filter(ConversationParticipant.user_id == user.id)
        .options(joinedload(Conversation.participants).joinedload(ConversationParticipant.user).joinedload(User.profile))
    )
    items, total, total_pages = apply_pagination(
        query, params, default_sort="updated_at", sort_map={"updated_at": Conversation.updated_at}
    )
    out = []
    for conv in items:
        other_ids = [p.user_id for p in conv.participants if p.user_id != user.id]
        if any(oid in blocked for oid in other_ids):
            continue
        last_msg = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).first()
        participants = [_author_brief(p.user) for p in conv.participants if p.user_id != user.id]
        out.append(
            ConversationOut(
                id=conv.id,
                type=conv.type.value,
                title=conv.title,
                updated_at=conv.updated_at,
                participants=[p for p in participants if p],
                last_message=MessageOut(
                    id=last_msg.id,
                    conversation_id=last_msg.conversation_id,
                    sender_id=last_msg.sender_id,
                    body=last_msg.body,
                    status=last_msg.status,
                    created_at=last_msg.created_at,
                    sender=_author_brief(last_msg.sender) if last_msg.sender else None,
                )
                if last_msg
                else None,
            )
        )
    return paginated(out, total, params, total_pages)


def _conversation_out(conv: Conversation, user_id: str) -> ConversationOut:
    participants = [_author_brief(p.user) for p in conv.participants if p.user_id != user_id]
    return ConversationOut(
        id=conv.id,
        type=conv.type.value,
        title=conv.title,
        updated_at=conv.updated_at,
        participants=[p for p in participants if p],
    )


@router.post("/conversations", response_model=ConversationOut, status_code=201)
def create_conversation(payload: ConversationCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    participant_ids = set(payload.participant_ids + [user.id])

    # Reuse an existing direct conversation between exactly these two users.
    if payload.type == "direct" and len(participant_ids) == 2:
        others = [pid for pid in participant_ids if pid != user.id]
        if others:
            other_id = others[0]
            existing = (
                db.query(Conversation)
                .join(ConversationParticipant)
                .filter(Conversation.type == ConversationType.direct, ConversationParticipant.user_id == user.id)
                .options(joinedload(Conversation.participants).joinedload(ConversationParticipant.user).joinedload(User.profile))
                .all()
            )
            for conv in existing:
                pids = {p.user_id for p in conv.participants}
                if pids == participant_ids:
                    return _conversation_out(conv, user.id)

    conv = Conversation(
        tenant_id=user.tenant_id,
        type=ConversationType(payload.type),
        title=payload.title,
        created_by=user.id,
    )
    db.add(conv)
    db.flush()
    for pid in participant_ids:
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=pid))
    db.commit()
    db.refresh(conv)
    return _conversation_out(conv, user.id)


@router.get("/conversations/{conversation_id}/messages", response_model=dict)
def list_messages(
    conversation_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conversation_id, ConversationParticipant.user_id == user.id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a participant")
    params = PaginationParams(page=page, page_size=page_size)
    query = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .options(joinedload(Message.sender).joinedload(User.profile))
    )
    items, total, total_pages = apply_pagination(
        query, params, default_sort="created_at", sort_map={"created_at": Message.created_at}
    )
    out = [
        MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            body=m.body,
            status=m.status,
            created_at=m.created_at,
            sender=_author_brief(m.sender),
        )
        for m in items
    ]
    return paginated(out, total, params, total_pages)


@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut, status_code=201)
def send_message(
    conversation_id: str,
    payload: MessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conversation_id, ConversationParticipant.user_id == user.id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a participant")

    others = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conversation_id, ConversationParticipant.user_id != user.id)
        .all()
    )
    for p in others:
        if is_blocked(db, user.id, p.user_id):
            raise HTTPException(status_code=403, detail="Cannot message blocked user")

    message = Message(conversation_id=conversation_id, sender_id=user.id, body=payload.body)
    db.add(message)
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.updated_at = message.created_at

    sender_name = user.profile.display_name if user.profile else "Someone"
    for p in others:
        notif = Notification(
            tenant_id=user.tenant_id,
            user_id=p.user_id,
            type=NotificationType.message,
            title="New message",
            body=f"{sender_name}: {payload.body[:80]}",
        )
        db.add(notif)
        send_push_to_user(db, p.user_id, "New message", f"{sender_name}: {payload.body[:80]}")

    db.commit()
    db.refresh(message)
    return MessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        body=message.body,
        status=message.status,
        created_at=message.created_at,
        sender=_author_brief(user),
    )
