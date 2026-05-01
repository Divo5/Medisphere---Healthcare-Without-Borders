"""
Eye Disease Prediction Router
POST /api/eye/predict     – Upload eye image & get CNN prediction (public)
GET  /api/eye/history     – User's scan history (auth)
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from datetime import datetime

from app.utils.jwt_handler import get_current_user
from app.utils.file_upload import upload_eye_image
from app.ai_models.eye_cnn import predict_eye_disease
from app.database.mongodb_connect import get_db

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"}


@router.post("/predict", response_model=dict)
async def predict_eye(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Predict + save result to user history (auth required)."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only image files are accepted")

    db = get_db()
    contents = await file.read()
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 15MB.")

    result = await predict_eye_disease(contents)

    # Save scan record to history
    scan_record = {
        "user_id":        current_user["user_id"],
        "type":           "eye_scan",
        "file_name":      file.filename,
        "content_type":   file.content_type,
        "predicted_class": result["predicted_class"],
        "confidence":     result["confidence"],
        "risk_level":     result["risk_level"],
        "all_predictions": result["all_predictions"],
        "advice":         result["advice"],
        "see_doctor":     result["see_doctor"],
        "created_at":     datetime.utcnow(),
    }
    await db.eye_scans.insert_one(scan_record)

    return result


@router.get("/history", response_model=dict)
async def eye_scan_history(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.eye_scans.find(
        {"user_id": current_user["user_id"]}
    ).sort("created_at", -1).limit(20)

    scans = []
    async for s in cursor:
        s["id"] = str(s["_id"])
        del s["_id"]
        s["created_at"] = str(s.get("created_at", ""))
        scans.append(s)

    return {"total": len(scans), "data": scans}
