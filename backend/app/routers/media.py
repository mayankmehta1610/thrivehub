from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.deps import get_current_user
from app.models import User
from app.utils.storage import upload_file

router = APIRouter(prefix="/media", tags=["Media"])


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    folder: str = "media",
    user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith(("image/", "video/")):
        raise HTTPException(status_code=400, detail="Only image and video files are allowed")
    return await upload_file(file, folder=folder)
