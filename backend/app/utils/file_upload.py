"""
File Upload Utility – AWS S3 / Cloudinary
"""

import uuid
import boto3
import os
import aiofiles
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
from app.config import settings


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"}
ALLOWED_DOC_TYPES   = {"application/pdf"} | ALLOWED_IMAGE_TYPES
MAX_FILE_SIZE_MB    = 15


def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY,
        aws_secret_access_key=settings.AWS_SECRET_KEY,
        region_name=settings.AWS_REGION,
    )


async def upload_to_local(file: UploadFile, folder: str = "uploads") -> str:
    """Save file to local storage and return relative URL."""
    file.file.seek(0)
    contents = await file.read()

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    
    # Ensure folder exists
    local_path = os.path.join("storage", folder)
    os.makedirs(local_path, exist_ok=True)
    
    full_path = os.path.join(local_path, filename)
    
    async with aiofiles.open(full_path, mode='wb') as f:
        await f.write(contents)
    
    # Return relative URL for frontend
    return f"/storage/{folder}/{filename}"


async def upload_to_s3(file: UploadFile, folder: str = "uploads") -> str:
    """Upload file to AWS S3 and return public URL."""
    file.file.seek(0)
    contents = await file.read()

    # Validate size
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE_MB}MB allowed.")

    # Validate type
    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type.")

    if not settings.AWS_ACCESS_KEY or "your-aws" in settings.AWS_ACCESS_KEY:
        # Skip S3 if not configured
        return await upload_to_local(file, folder)

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    key = f"{folder}/{uuid.uuid4().hex}.{ext}"

    try:
        s3 = get_s3_client()
        s3.put_object(
            Bucket=settings.AWS_BUCKET_NAME,
            Key=key,
            Body=contents,
            ContentType=file.content_type,
        )
        url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
        return url
    except Exception as e:
        print(f"S3 Upload failed, falling back to local: {e}")
        return await upload_to_local(file, folder)


async def upload_prescription(file: UploadFile, user_id: str) -> str:
    return await upload_to_s3(file, folder=f"prescriptions/{user_id}")


async def upload_eye_image(file: UploadFile, user_id: str) -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only image files allowed for eye scan.")
    return await upload_to_s3(file, folder=f"eye_scans/{user_id}")


async def upload_profile_pic(file: UploadFile, user_id: str) -> str:
    return await upload_to_s3(file, folder=f"profiles/{user_id}")


def delete_from_s3(url: str) -> bool:
    """Delete object from S3 given its full URL."""
    try:
        key = url.split(".amazonaws.com/")[-1]
        s3 = get_s3_client()
        s3.delete_object(Bucket=settings.AWS_BUCKET_NAME, Key=key)
        return True
    except Exception:
        return False
