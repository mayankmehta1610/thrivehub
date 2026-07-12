import os
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import settings

_s3_client = None


def _get_s3():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    if not settings.s3_access_key or not settings.s3_secret_key:
        return None
    try:
        import boto3

        kwargs = {
            "aws_access_key_id": settings.s3_access_key,
            "aws_secret_access_key": settings.s3_secret_key,
            "region_name": settings.s3_region,
        }
        if settings.s3_endpoint:
            kwargs["endpoint_url"] = settings.s3_endpoint
        _s3_client = boto3.client("s3", **kwargs)
        return _s3_client
    except Exception:
        return None


def _local_dir() -> Path:
    d = Path(settings.local_upload_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d


async def upload_bytes(
    content: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
    folder: str = "media",
) -> dict:
    ext = ""
    if filename and "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()
    key = f"{folder}/{uuid.uuid4().hex}{ext}"

    s3 = _get_s3()
    if s3:
        s3.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=content,
            ContentType=content_type or "application/octet-stream",
        )
        if settings.s3_endpoint:
            url = f"{settings.s3_endpoint.rstrip('/')}/{settings.s3_bucket}/{key}"
        else:
            url = f"https://{settings.s3_bucket}.s3.{settings.s3_region}.amazonaws.com/{key}"
        return {"key": key, "url": url, "storage": "s3"}

    local_path = _local_dir() / key.replace("/", os.sep)
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(content)
    url = f"/uploads/{key}"
    return {"key": key, "url": url, "storage": "local"}


async def upload_file(file: UploadFile, folder: str = "media") -> dict:
    content = await file.read()
    return await upload_bytes(
        content,
        content_type=file.content_type,
        filename=file.filename,
        folder=folder,
    )
