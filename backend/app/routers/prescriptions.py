"""
Prescription Router
POST /api/prescriptions/upload   – Upload & OCR prescription (public)
GET  /api/prescriptions/my       – User's prescriptions (auth)
GET  /api/prescriptions/{id}     – Single prescription detail (auth)
DELETE /api/prescriptions/{id}   – Delete prescription (auth)
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from datetime import datetime
from bson import ObjectId

from app.utils.jwt_handler import get_current_user
from app.utils.file_upload import upload_prescription
from app.ai_models.ocr_extract import extract_prescription_data
from app.database.mongodb_connect import get_db

router = APIRouter()

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/webp",
    "image/bmp", "application/pdf"
}


@router.post("/upload", response_model=dict, status_code=201)
async def upload_prescription_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a prescription image/PDF, run OCR, and save to user's records."""
    db = get_db()

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, or PDF files allowed")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    # Run OCR extraction
    ocr_result = await extract_prescription_data(contents, file.content_type)

    # Upload to S3
    file.file.seek(0) if hasattr(file.file, "seek") else None
    try:
        file_url = await upload_prescription(file, current_user["user_id"])
    except Exception:
        file_url = ""  # Fallback if S3 not configured

    # Save to DB
    prescription_doc = {
        "user_id":         current_user["user_id"],
        "file_name":       file.filename,
        "file_url":        file_url,
        "doctor_name":     ocr_result.get("doctor_name", ""),
        "hospital":        ocr_result.get("hospital", ""),
        "prescription_date": ocr_result.get("date", ""),
        "patient_name":    ocr_result.get("patient_name", ""),
        "medicines":       ocr_result.get("medicines", []),
        "raw_text":        ocr_result.get("raw_text", ""),
        "ocr_confidence":  ocr_result.get("confidence", 0.0),
        "is_verified":     False,
        "is_active":       True,
        "created_at":      datetime.utcnow(),
    }
    result = await db.prescriptions.insert_one(prescription_doc)

    return {
        "message":         "Prescription uploaded and processed",
        "prescription_id": str(result.inserted_id),
        "ocr_result":      ocr_result,
        "file_url":        file_url,
    }


@router.get("/my", response_model=dict)
async def my_prescriptions(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.prescriptions.find(
        {"user_id": current_user["user_id"], "is_active": True}
    ).sort("created_at", -1)

    prescriptions = []
    async for p in cursor:
        p["id"] = str(p["_id"])
        del p["_id"]
        p["created_at"] = str(p.get("created_at", ""))
        prescriptions.append(p)

    return {"total": len(prescriptions), "data": prescriptions}


@router.get("/{rx_id}", response_model=dict)
async def get_prescription(rx_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        rx = await db.prescriptions.find_one({"_id": ObjectId(rx_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid prescription ID")
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if rx["user_id"] != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    rx["id"] = str(rx["_id"]); del rx["_id"]
    rx["created_at"] = str(rx.get("created_at", ""))
    return rx


@router.put("/{rx_id}/verify", response_model=dict)
async def verify_prescription(
    rx_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update prescription with user-verified details."""
    db = get_db()
    try:
        rx = await db.prescriptions.find_one({"_id": ObjectId(rx_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid prescription ID")
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if rx["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    update_doc = {
        "doctor_name": data.get("doctor_name", rx.get("doctor_name")),
        "prescription_date": data.get("date", rx.get("prescription_date")),
        "medicines": data.get("medicines", rx.get("medicines")),
        "is_verified": True,
        "verified_at": datetime.utcnow()
    }

    await db.prescriptions.update_one(
        {"_id": ObjectId(rx_id)},
        {"$set": update_doc}
    )

    return {"message": "Prescription verified and saved"}


@router.delete("/{rx_id}", response_model=dict)
async def delete_prescription(rx_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        rx = await db.prescriptions.find_one({"_id": ObjectId(rx_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid prescription ID")
    if not rx or rx["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Prescription not found")

    await db.prescriptions.update_one(
        {"_id": ObjectId(rx_id)},
        {"$set": {"is_active": False}}
    )
    return {"message": "Prescription deleted"}
