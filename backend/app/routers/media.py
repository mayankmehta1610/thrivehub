from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.utils.storage import upload_bytes
from app.utils.upload_limits import get_upload_limits, validate_upload_size

router = APIRouter(prefix="/media", tags=["Media"])


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    folder: str = "media",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith(("image/", "video/", "audio/")):
        raise HTTPException(status_code=400, detail="Only image, video and audio files are allowed")

    content = await file.read()
    limits = get_upload_limits(db)
    validate_upload_size(file.content_type, len(content), limits)

    return await upload_bytes(
        content,
        content_type=file.content_type,
        filename=file.filename,
        folder=folder,
    )
