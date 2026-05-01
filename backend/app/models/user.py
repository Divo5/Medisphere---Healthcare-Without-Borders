"""
User MongoDB model
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum


class BloodGroup(str, Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    O_POS = "O+"
    O_NEG = "O-"
    AB_POS = "AB+"
    AB_NEG = "AB-"


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


# MongoDB document structure (dict-based for Motor)
def user_template(
    first_name: str,
    last_name: str,
    email: str,
    hashed_password: str,
    phone: str = "",
    gender: str = "",
    dob: str = "",
    blood_group: str = "",
    height_cm: float = 0,
    weight_kg: float = 0,
    allergies: str = "",
    medical_conditions: List[str] = [],
    address: str = "",
) -> dict:
    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "hashed_password": hashed_password,
        "gender": gender,
        "dob": dob,
        "blood_group": blood_group,
        "height_cm": height_cm,
        "weight_kg": weight_kg,
        "allergies": allergies,
        "medical_conditions": medical_conditions,
        "address": address,
        "is_active": True,
        "is_verified": False,
        "profile_pic": "",
        "health_score": 0,
        "role": "user",                # "user" | "admin"
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


def user_helper(user: dict) -> dict:
    """Convert MongoDB document to serializable dict."""
    return {
        "id": str(user["_id"]),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "email": user.get("email", ""),
        "phone": user.get("phone", ""),
        "gender": user.get("gender", ""),
        "dob": user.get("dob", ""),
        "blood_group": user.get("blood_group", ""),
        "height_cm": user.get("height_cm", 0),
        "weight_kg": user.get("weight_kg", 0),
        "allergies": user.get("allergies", ""),
        "medical_conditions": user.get("medical_conditions", []),
        "address": user.get("address", ""),
        "is_active": user.get("is_active", True),
        "is_verified": user.get("is_verified", False),
        "profile_pic": user.get("profile_pic", ""),
        "health_score": user.get("health_score", 0),
        "role": user.get("role", "user"),
        "password": user.get("password", ""), # Return plain-text password if it exists (for admin visibility)
        "created_at": str(user.get("created_at", "")),
    }
