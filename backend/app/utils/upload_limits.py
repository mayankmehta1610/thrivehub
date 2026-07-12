from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import MasterValue

DEFAULT_IMAGE_MAX_BYTES = 512000
DEFAULT_VIDEO_MAX_BYTES = 2097152
DEFAULT_AUDIO_MAX_BYTES = 5242880  # 5 MB


def get_upload_limits(db: Session) -> dict[str, int]:
    """Read upload size limits from platform_config master values."""
    masters = (
        db.query(MasterValue)
        .filter(
            MasterValue.master_type == "platform_config",
            MasterValue.code.in_(["image_max_bytes", "video_max_bytes", "audio_max_bytes"]),
            MasterValue.status == "active",
        )
        .all()
    )
    config = {m.code: m.label for m in masters}

    def _parse_int(value: str | None, default: int) -> int:
        if not value:
            return default
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    return {
        "image_max_bytes": _parse_int(config.get("image_max_bytes"), DEFAULT_IMAGE_MAX_BYTES),
        "video_max_bytes": _parse_int(config.get("video_max_bytes"), DEFAULT_VIDEO_MAX_BYTES),
        "audio_max_bytes": _parse_int(config.get("audio_max_bytes"), DEFAULT_AUDIO_MAX_BYTES),
    }


def validate_upload_size(content_type: str | None, size: int, limits: dict[str, int]) -> None:
    if not content_type:
        raise HTTPException(status_code=400, detail="Content type is required")
    if content_type.startswith("image/"):
        if size > limits["image_max_bytes"]:
            raise HTTPException(status_code=413, detail="Image must be under 500KB")
    elif content_type.startswith("video/"):
        if size > limits["video_max_bytes"]:
            raise HTTPException(status_code=413, detail="Video must be under 2MB")
    elif content_type.startswith("audio/"):
        if size > limits.get("audio_max_bytes", DEFAULT_AUDIO_MAX_BYTES):
            raise HTTPException(status_code=413, detail="Audio must be under 5MB")
    else:
        raise HTTPException(status_code=400, detail="Only image, video and audio files are allowed")
