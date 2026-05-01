"""
Symptom Checker AI Router
POST /api/symptoms/check     – Analyze symptoms (public)
GET  /api/symptoms/history   – User's check history (auth)
"""

from fastapi import APIRouter, Depends
from datetime import datetime

from app.schemas.schemas import SymptomCheckSchema, SymptomResultSchema
from app.utils.jwt_handler import get_current_user
from app.ai_models.symptom_ai import analyze_symptoms
from app.database.mongodb_connect import get_db

router = APIRouter()


@router.post("/check", response_model=dict)
async def check_symptoms(
    data: SymptomCheckSchema,
    current_user: dict = Depends(get_current_user),
):
    """Analyze symptoms and save report to user history (auth required)."""
    db = get_db()
    result = await analyze_symptoms(
        symptoms=data.symptoms,
        description=data.description or "",
        age=data.age,
        gender=data.gender,
        duration=data.duration,
    )

    # Save report to history
    report = {
        "user_id":     current_user["user_id"],
        "type":        "symptom_check",
        "symptoms":    data.symptoms,
        "description": data.description,
        "result":      result,
        "created_at":  datetime.utcnow(),
    }
    await db.symptom_reports.insert_one(report)

    return result


@router.get("/history", response_model=dict)
async def symptom_history(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.symptom_reports.find(
        {"user_id": current_user["user_id"]}
    ).sort("created_at", -1).limit(20)

    reports = []
    async for r in cursor:
        r["id"] = str(r["_id"])
        del r["_id"]
        r["created_at"] = str(r.get("created_at", ""))
        reports.append(r)

    return {"total": len(reports), "data": reports}
