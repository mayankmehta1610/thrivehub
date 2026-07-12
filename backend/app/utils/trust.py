from sqlalchemy.orm import Session

from app.models import UserBlock, UserMute


def get_blocked_ids(db: Session, user_id: str) -> set[str]:
    blocks = db.query(UserBlock).filter(UserBlock.blocker_id == user_id).all()
    blocked_by = db.query(UserBlock).filter(UserBlock.blocked_id == user_id).all()
    return {b.blocked_id for b in blocks} | {b.blocker_id for b in blocked_by}


def get_muted_ids(db: Session, user_id: str) -> set[str]:
    mutes = db.query(UserMute).filter(UserMute.muter_id == user_id).all()
    return {m.muted_id for m in mutes}


def is_blocked(db: Session, user_a: str, user_b: str) -> bool:
    return (
        db.query(UserBlock)
        .filter(
            ((UserBlock.blocker_id == user_a) & (UserBlock.blocked_id == user_b))
            | ((UserBlock.blocker_id == user_b) & (UserBlock.blocked_id == user_a))
        )
        .first()
        is not None
    )
