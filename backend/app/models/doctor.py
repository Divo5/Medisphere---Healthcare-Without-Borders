"""
Doctor MongoDB model
"""

from datetime import datetime
from typing import List


SPECIALTIES = [
    "Cardiologist", "Dermatologist", "Neurologist", "Orthopedic",
    "Ophthalmologist", "Pediatrician", "Psychiatrist", "General Physician",
    "Gynecologist", "Oncologist", "Endocrinologist", "Gastroenterologist",
]

CONSULTATION_MODES = ["video", "chat", "in_clinic"]


def doctor_template(
    first_name: str,
    last_name: str,
    email: str,
    hashed_password: str,
    specialty: str,
    qualification: str,
    experience_years: int,
    consultation_fee: float,
    phone: str = "",
    bio: str = "",
    hospital: str = "",
    location: str = "",
    modes: List[str] = ["video"],
    languages: List[str] = ["English", "Hindi"],
    tags: List[str] = [],
) -> dict:
    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "hashed_password": hashed_password,
        "specialty": specialty,
        "qualification": qualification,
        "experience_years": experience_years,
        "consultation_fee": consultation_fee,
        "bio": bio,
        "hospital": hospital,
        "location": location,
        "modes": modes,
        "languages": languages,
        "tags": tags,
        "profile_pic": "",
        "rating": 0.0,
        "total_reviews": 0,
        "total_consultations": 0,
        "is_available": True,
        "is_verified": False,       # Admin must approve
        "wait_time_minutes": 0,
        "available_slots": [],
        "role": "doctor",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


def doctor_helper(doctor: dict) -> dict:
    first_name = doctor.get("first_name", "")
    last_name = doctor.get("last_name", "")
    return {
        "id": str(doctor["_id"]),
        "first_name": first_name,
        "last_name": last_name,
        "name": f"Dr. {first_name} {last_name}".strip() if first_name or last_name else "Specialist Doctor",
        "email": doctor.get("email", ""),
        "phone": doctor.get("phone", ""),
        "specialty": doctor.get("specialty", ""),
        "qualification": doctor.get("qualification", ""),
        "experience_years": doctor.get("experience_years", 0),
        "consultation_fee": doctor.get("consultation_fee", 0),
        "bio": doctor.get("bio", ""),
        "hospital": doctor.get("hospital", ""),
        "location": doctor.get("location", ""),
        "modes": doctor.get("modes", []),
        "languages": doctor.get("languages", []),
        "tags": doctor.get("tags", []),
        "profile_pic": doctor.get("profile_pic", ""),
        "rating": doctor.get("rating", 0.0),
        "total_reviews": doctor.get("total_reviews", 0),
        "total_consultations": doctor.get("total_consultations", 0),
        "is_available": doctor.get("is_available", True),
        "is_verified": doctor.get("is_verified", False),
        "wait_time_minutes": doctor.get("wait_time_minutes", 0),
        "created_at": str(doctor.get("created_at", "")),
    }
