"""
Pydantic v2 Schemas – Request & Response validation
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ── AUTH SCHEMAS ──────────────────────────────────────────────────────────────

class UserRegisterSchema(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name:  str = Field(..., min_length=2, max_length=50)
    email:      EmailStr
    phone:      str = Field(..., min_length=10, max_length=20)
    password:   str = Field(..., min_length=8, max_length=128)
    gender:     Optional[str] = None
    dob:        Optional[str] = None
    blood_group:Optional[str] = None
    height_cm:  Optional[float] = None
    weight_kg:  Optional[float] = None
    allergies:  Optional[str] = ""
    medical_conditions: Optional[List[str]] = []
    address:    Optional[str] = ""

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLoginSchema(BaseModel):
    email:    EmailStr
    password: str


class TokenSchema(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


class UserResponseSchema(BaseModel):
    id:           str
    first_name:   str
    last_name:    str
    email:        str
    phone:        str
    gender:       Optional[str]
    blood_group:  Optional[str]
    is_verified:  bool
    health_score: int
    role:         str
    created_at:   str


# ── DOCTOR SCHEMAS ────────────────────────────────────────────────────────────

class DoctorRegisterSchema(BaseModel):
    first_name:       str = Field(..., min_length=2)
    last_name:        str = Field(..., min_length=2)
    email:            EmailStr
    phone:            str
    password:         str = Field(..., min_length=8)
    specialty:        str
    qualification:    str
    experience_years: int = Field(..., ge=0, le=60)
    consultation_fee: float = Field(..., ge=0)
    bio:              Optional[str] = ""
    hospital:         Optional[str] = ""
    location:         Optional[str] = ""
    modes:            List[str] = ["video"]
    languages:        List[str] = ["English"]
    tags:             Optional[List[str]] = []


class DoctorResponseSchema(BaseModel):
    id:               str
    first_name:       str
    last_name:        str
    specialty:        str
    qualification:    str
    experience_years: int
    consultation_fee: float
    hospital:         Optional[str]
    location:         Optional[str]
    modes:            List[str]
    rating:           float
    total_reviews:    int
    is_available:     bool
    wait_time_minutes:int
    is_verified:      bool


class BookAppointmentSchema(BaseModel):
    doctor_id:   str
    date:        str   # "2025-03-20"
    slot:        str   # "10:30 AM"
    mode:        str   # "video" | "chat" | "in_clinic"
    reason:      Optional[str] = ""


# ── MEDICINE SCHEMAS ──────────────────────────────────────────────────────────

class MedicineResponseSchema(BaseModel):
    id:                   str
    name:                 str
    brand:                str
    generic_name:         str
    category:             str
    price:                float
    mrp:                  float
    discount_percent:     float
    unit:                 str
    description:          str
    requires_prescription:bool
    in_stock:             bool
    stock_quantity:       int
    rating:               float


class CartItemSchema(BaseModel):
    medicine_id: str
    quantity:    int = Field(..., ge=1, le=50)


class PlaceOrderSchema(BaseModel):
    items:            List[CartItemSchema]
    delivery_address: str = Field(..., min_length=10)
    payment_method:   str = "cod"      # "cod" | "upi" | "card"
    prescription_id:  Optional[str] = None


class OrderResponseSchema(BaseModel):
    id:               str
    items:            list
    total_amount:     float
    status:           str
    tracking_id:      str
    payment_method:   str
    payment_status:   str
    created_at:       str


# ── SYMPTOM CHECKER SCHEMAS ───────────────────────────────────────────────────

class SymptomCheckSchema(BaseModel):
    symptoms:    List[str] = Field(..., min_length=1)
    description: Optional[str] = ""
    age:         Optional[int] = None
    gender:      Optional[str] = None
    duration:    Optional[str] = None   # "today" | "2-3 days" | "1 week"


class SymptomResultSchema(BaseModel):
    risk_level:       str            # "low" | "medium" | "high"
    risk_score:       float
    conditions:       List[dict]     # [{name, probability, description}]
    recommendations:  List[str]
    see_doctor:       bool
    emergency:        bool


# ── EYE DISEASE SCHEMAS ───────────────────────────────────────────────────────

class EyePredictionResultSchema(BaseModel):
    predicted_class:  str
    confidence:       float
    all_predictions:  List[dict]     # [{class, probability}]
    risk_level:       str
    advice:           str
    see_doctor:       bool


# ── PAYMENT SCHEMAS ──────────────────────────────────────────────────────────

class RazorpayOrderCreateSchema(BaseModel):
    amount: float
    currency: str = "INR"
    is_demo: Optional[bool] = False

class RazorpayVerifySchema(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    reference_id: str
    type: str # "order" | "appointment"

class PaymentProcessSchema(BaseModel):
    reference_id:   str      # Order ID or Appointment ID
    type:           str      # "order" | "appointment"
    amount:         float
    payment_method: str      # "card" | "upi" | "net_banking"
    transaction_id: str      # Simulated from frontend or generated
    status:         str = "completed"

class PaymentResponseSchema(BaseModel):
    payment_id:     str
    reference_id:   str
    type:           str
    amount:         float
    status:         str
    transaction_id: str
    created_at:     str


# ── PRESCRIPTION SCHEMAS ──────────────────────────────────────────────────────

class PrescriptionResponseSchema(BaseModel):
    id:              str
    user_id:         str
    doctor_name:     Optional[str]
    hospital:        Optional[str]
    prescription_date: Optional[str]
    medicines:       List[dict]
    file_url:        str
    ocr_confidence:  float
    is_verified:     bool
    created_at:      str
