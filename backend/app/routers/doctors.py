"""
Doctors Router
GET  /api/doctors               – List all verified doctors (public)
GET  /api/doctors/{id}          – Get doctor detail
GET  /api/doctors/search        – Search by specialty, name
POST /api/doctors/register      – Doctor self-register
POST /api/doctors/book          – Book appointment (auth required)
GET  /api/doctors/appointments  – User's own appointments
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime
import random
from bson import ObjectId

from app.schemas.schemas import DoctorRegisterSchema, BookAppointmentSchema
from app.models.doctor import doctor_template, doctor_helper
from app.utils.jwt_handler import hash_password, get_current_user
from app.utils.email_utils import send_appointment_confirmation
from app.database.mongodb_connect import get_db

router = APIRouter()


# ── LIST DOCTORS ──────────────────────────────────────────────────────────────
@router.get("/", response_model=dict)
async def list_doctors(
    specialty: Optional[str] = None,
    mode:      Optional[str] = None,
    available: Optional[bool] = None,
    search:    Optional[str] = None,
    page:      int = Query(1, ge=1),
    limit:     int = Query(12, ge=1, le=50),
):
    db = get_db()
    if db is None:
        # Fallback mock data when DB is disconnected
        mock_doctors = [
            {"id": "mock1", "name": "Dr. Priya Sharma", "first_name": "Priya", "last_name": "Sharma", "specialty": "Cardiologist", "rating": 4.9, "total_reviews": 120, "consultation_fee": 500, "hospital": "City Medical Centre", "is_available": True, "modes": ["video", "chat"], "gender": "Female"},
            {"id": "mock2", "name": "Dr. Arjun Mehta", "first_name": "Arjun", "last_name": "Mehta", "specialty": "Neurologist", "rating": 4.8, "total_reviews": 95, "consultation_fee": 700, "hospital": "Neuro Care", "is_available": True, "modes": ["video"], "gender": "Male"},
            {"id": "mock3", "name": "Dr. Sneha Gupta", "first_name": "Sneha", "last_name": "Gupta", "specialty": "Dermatologist", "rating": 4.7, "total_reviews": 150, "consultation_fee": 400, "hospital": "Skin Clinic", "is_available": True, "modes": ["video", "chat"], "gender": "Female"},
        ]
        return {
            "total": len(mock_doctors),
            "page": page,
            "limit": limit,
            "pages": 1,
            "data": mock_doctors,
            "message": "Database disconnected. Using mock data."
        }
    query: dict = {"is_verified": True}

    if specialty:
        query["specialty"] = {"$regex": specialty, "$options": "i"}
    if mode:
        query["modes"] = mode
    if available is not None:
        query["is_available"] = available
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name":  {"$regex": search, "$options": "i"}},
            {"specialty":  {"$regex": search, "$options": "i"}},
            {"hospital":   {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    total = await db.doctors.count_documents(query)
    cursor = db.doctors.find(query).skip(skip).limit(limit).sort("rating", -1)
    doctors = [doctor_helper(d) async for d in cursor]

    return {
        "total": total,
        "page":  page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "data":  doctors,
    }


# ── GET DOCTOR ────────────────────────────────────────────────────────────────
@router.get("/{doctor_id}", response_model=dict)
async def get_doctor(doctor_id: str):
    db = get_db()
    try:
        doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor_helper(doctor)


# ── REGISTER DOCTOR ───────────────────────────────────────────────────────────
@router.post("/register", response_model=dict, status_code=201)
async def register_doctor(data: DoctorRegisterSchema):
    db = get_db()
    if await db.doctors.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = doctor_template(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        specialty=data.specialty,
        qualification=data.qualification,
        experience_years=data.experience_years,
        consultation_fee=data.consultation_fee,
        phone=data.phone,
        bio=data.bio or "",
        hospital=data.hospital or "",
        location=data.location or "",
        modes=data.modes,
        languages=data.languages,
        tags=data.tags or [],
    )
    result = await db.doctors.insert_one(doc)
    return {
        "message": "Doctor registered. Awaiting admin verification.",
        "doctor_id": str(result.inserted_id),
    }


# ── BOOK APPOINTMENT ──────────────────────────────────────────────────────────
@router.post("/book", response_model=dict, status_code=201)
async def book_appointment(
    data: BookAppointmentSchema,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    
    # Handle DB disconnected state or mock IDs
    if db is None or str(data.doctor_id).startswith("mock"):
        # Mock logic for disconnected DB or demo mock doctors
        mock_names = {"mock1": "Dr. Priya Sharma", "mock2": "Dr. Arjun Mehta", "mock3": "Dr. Sneha Gupta"}
        doctor_name = mock_names.get(data.doctor_id, "Specialist Doctor")
        
        return {
            "message":        "Appointment booked successfully! (Mock Mode)",
            "appointment_id": f"mock_appt_{random.randint(1000, 9999)}",
            "doctor":         doctor_name,
            "date":           data.date,
            "slot":           data.slot,
            "mode":           data.mode,
            "join_url":       f"https://meet.medisphere.com/room/mock-{random.randint(1000, 9999)}",
        }

    try:
        doctor = await db.doctors.find_one({"_id": ObjectId(data.doctor_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if not doctor.get("is_available", True):
        raise HTTPException(status_code=400, detail="Doctor is not available")

    appointment = {
        "user_id":   current_user["user_id"],
        "doctor_id": data.doctor_id,
        "doctor_name": f"Dr. {doctor['first_name']} {doctor['last_name']}",
        "specialty": doctor["specialty"],
        "date":      data.date,
        "slot":      data.slot,
        "mode":      data.mode,
        "reason":    data.reason,
        "fee":       doctor["consultation_fee"],
        "status":    "confirmed",
        "join_url":  f"https://meet.medisphere.com/room/{ObjectId()}",
        "created_at": datetime.utcnow(),
    }
    result = await db.appointments.insert_one(appointment)

    # Email confirmation
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if user:
        send_appointment_confirmation(
            user["email"],
            user["first_name"],
            appointment["doctor_name"],
            data.date,
            data.slot,
        )

    return {
        "message":        "Appointment booked successfully!",
        "appointment_id": str(result.inserted_id),
        "doctor":         appointment["doctor_name"],
        "date":           data.date,
        "slot":           data.slot,
        "mode":           data.mode,
        "join_url":       appointment["join_url"],
    }


# ── MY APPOINTMENTS ───────────────────────────────────────────────────────────
@router.get("/user/appointments", response_model=dict)
async def my_appointments(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if db is None:
        # Mock history when DB is disconnected
        return {
            "total": 1, 
            "data": [{
                "id": "mock_appt_1",
                "doctor_name": "Dr. Priya Sharma",
                "specialty": "Cardiologist",
                "date": "2025-03-30",
                "slot": "10:30 AM",
                "mode": "video",
                "status": "confirmed",
                "created_at": str(datetime.utcnow())
            }]
        }

    cursor = db.appointments.find({"user_id": current_user["user_id"]}).sort("date", -1)
    appts = []
    async for a in cursor:
        a["id"] = str(a["_id"]); del a["_id"]
        a["created_at"] = str(a.get("created_at", ""))
        appts.append(a)
    return {"total": len(appts), "data": appts}
