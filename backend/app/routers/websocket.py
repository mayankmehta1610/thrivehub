import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session, joinedload

from app.database import SessionLocal
from app.models import ConversationParticipant, Message, User
from app.routers.posts import _author_brief
from app.utils.security import decode_token
from app.utils.trust import is_blocked

router = APIRouter(tags=["WebSocket"])

_connections: dict[str, set[WebSocket]] = {}
_user_conversations: dict[str, set[str]] = {}


class ConnectionManager:
    async def connect(self, websocket: WebSocket, user_id: str, conversation_id: str):
        await websocket.accept()
        key = f"{conversation_id}:{user_id}"
        _connections.setdefault(key, set()).add(websocket)
        _user_conversations.setdefault(user_id, set()).add(conversation_id)

    def disconnect(self, websocket: WebSocket, user_id: str, conversation_id: str):
        key = f"{conversation_id}:{user_id}"
        if key in _connections:
            _connections[key].discard(websocket)
            if not _connections[key]:
                del _connections[key]

    async def broadcast_to_conversation(self, conversation_id: str, message: dict, exclude_user: str | None = None):
        for key, sockets in list(_connections.items()):
            if not key.startswith(f"{conversation_id}:"):
                continue
            user_id = key.split(":", 1)[1]
            if exclude_user and user_id == exclude_user:
                continue
            dead = []
            for ws in sockets:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                sockets.discard(ws)


manager = ConnectionManager()


def _authenticate_ws(token: str, db: Session) -> User | None:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    return db.query(User).filter(User.id == payload.get("sub")).first()


@router.websocket("/ws/messages/{conversation_id}")
async def websocket_messages(websocket: WebSocket, conversation_id: str, token: str = ""):
    db = SessionLocal()
    try:
        user = _authenticate_ws(token, db)
        if not user:
            await websocket.close(code=4001)
            return

        member = (
            db.query(ConversationParticipant)
            .filter(ConversationParticipant.conversation_id == conversation_id, ConversationParticipant.user_id == user.id)
            .first()
        )
        if not member:
            await websocket.close(code=4003)
            return

        await manager.connect(websocket, user.id, conversation_id)
        try:
            while True:
                data = await websocket.receive_json()
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    continue
                if data.get("type") != "message":
                    continue
                body = (data.get("body") or "").strip()
                if not body:
                    continue

                other_participants = (
                    db.query(ConversationParticipant)
                    .filter(
                        ConversationParticipant.conversation_id == conversation_id,
                        ConversationParticipant.user_id != user.id,
                    )
                    .all()
                )
                for p in other_participants:
                    if is_blocked(db, user.id, p.user_id):
                        await websocket.send_json({"type": "error", "detail": "Cannot message blocked user"})
                        continue

                message = Message(conversation_id=conversation_id, sender_id=user.id, body=body)
                db.add(message)
                from app.models import Conversation

                conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                if conv:
                    conv.updated_at = message.created_at
                db.commit()
                db.refresh(message)

                out = {
                    "type": "message",
                    "id": message.id,
                    "conversation_id": message.conversation_id,
                    "sender_id": message.sender_id,
                    "body": message.body,
                    "status": message.status,
                    "created_at": message.created_at.isoformat(),
                    "sender": _author_brief(user).model_dump() if _author_brief(user) else None,
                }
                await manager.broadcast_to_conversation(conversation_id, out)
        except WebSocketDisconnect:
            manager.disconnect(websocket, user.id, conversation_id)
    finally:
        db.close()
