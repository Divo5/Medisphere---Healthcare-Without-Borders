"""
Authentication Router
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/logout
GET  /api/auth/verify-email
POST /api/auth/forgot-password
POST /api/auth/reset-password
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime

from app.schemas.schemas import UserRegisterSchema, UserLoginSchema, TokenSchema, UserResponseSchema
from app.models.user import user_template, user_helper
from app.utils.jwt_handler import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    get_current_user, verify_token,
)
from app.utils.email_utils import send_verification_email, send_password_reset_email
from app.database.mongodb_connect import get_db
from bson import ObjectId
import secrets

router = APIRouter()


# ── REGISTER ──────────────────────────────────────────────────────────────────
@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegisterSchema):
    db = get_db()

    # Case-insensitive check for duplicate email
    if await db.users.find_one({"email": {"$regex": f"^{data.email}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user document
    user_doc = user_template(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        phone=data.phone,
        gender=data.gender or "",
        dob=data.dob or "",
        blood_group=data.blood_group or "",
        height_cm=data.height_cm or 0,
        weight_kg=data.weight_kg or 0,
        allergies=data.allergies or "",
        medical_conditions=data.medical_conditions or [],
        address=data.address or "",
    )

    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Email verification token
    verify_token_val = secrets.token_urlsafe(32)
    await db.email_tokens.insert_one({
        "user_id": user_id,
        "token": verify_token_val,
        "expires_at": datetime.utcnow().timestamp() + 86400,
    })
    send_verification_email(data.email, data.first_name, verify_token_val)

    # Issue tokens
    access_token  = create_access_token({"sub": user_id, "email": data.email, "role": "user"})
    refresh_token = create_refresh_token({"sub": user_id})

    return {
        "message": "Registration successful. Verification email sent.",
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "user": {"id": user_id, "email": data.email, "first_name": data.first_name},
    }


# ── LOGIN ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=dict)
async def login(data: UserLoginSchema):
    db = get_db()
    
    # 1. Normalize input
    email_clean = data.email.lower().strip()
    password_clean = data.password.strip()

    # MOCK LOGIN FOR ADMIN (Development bypass for MongoDB issues)
    if email_clean == "divyesh@medisphere.com" and password_clean == "Divyesh@123":
        access_token = create_access_token({"sub": "admin_mock_id", "email": email_clean, "role": "admin"})
        refresh_token = create_refresh_token({"sub": "admin_mock_id"})
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": "admin_mock_id",
                "email": email_clean,
                "first_name": "Divyesh",
                "role": "admin"
            }
        }

    # 2. Find user case-insensitively
    user = await db.users.find_one({
        "$or": [
            {"email": email_clean},
            {"email": {"$regex": f"^{email_clean}$", "$options": "i"}}
        ]
    })

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 3. Verify password
    is_valid = False
    
    # Try all possible password fields
    stored_hash = user.get("hashed_password") or user.get("password")
    
    if stored_hash:
        # Check if it looks like a bcrypt hash ($2b$, $2a$, $2y$)
        if stored_hash.startswith('$2') and len(stored_hash) >= 50:
            try:
                is_valid = verify_password(password_clean, stored_hash)
            except Exception:
                # If hash verification fails, try exact match just in case
                is_valid = (password_clean == stored_hash)
        else:
            # Plain text match for legacy or misconfigured records
            is_valid = (password_clean == stored_hash)

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    user_id = str(user["_id"])
    access_token  = create_access_token({"sub": user_id, "email": data.email, "role": user.get("role", "user")})
    refresh_token = create_refresh_token({"sub": user_id})

    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "user": user_helper(user),
    }


# ── ME ────────────────────────────────────────────────────────────────────────
@router.get("/me", response_model=dict)
async def get_me(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_helper(user)


# ── UPDATE PROFILE ────────────────────────────────────────────────────────────
@router.put("/profile", response_model=dict)
async def update_profile(
    data: dict, 
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    if db is None:
        return {"message": "Profile updated (Mock Mode)", "user": data}

    user_id = ObjectId(current_user["user_id"])
    
    # Fields allowed to be updated
    allowed_fields = [
        "first_name", "last_name", "phone", "blood_group", 
        "height_cm", "weight_kg", "address"
    ]
    
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = await db.users.update_one(
        {"_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    updated_user = await db.users.find_one({"_id": user_id})
    return user_helper(updated_user)


# ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=dict)
async def refresh_token(body: dict):
    token = body.get("refresh_token", "")
    payload = verify_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = payload.get("sub")
    new_access = create_access_token({"sub": user_id})
    return {"access_token": new_access, "token_type": "bearer"}


# ── VERIFY EMAIL ──────────────────────────────────────────────────────────────
@router.get("/verify-email")
async def verify_email(token: str = Query(...)):
    db = get_db()
    record = await db.email_tokens.find_one({"token": token})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid verification link")
    if datetime.utcnow().timestamp() > record["expires_at"]:
        raise HTTPException(status_code=400, detail="Verification link expired")

    await db.users.update_one(
        {"_id": ObjectId(record["user_id"])},
        {"$set": {"is_verified": True}}
    )
    await db.email_tokens.delete_one({"token": token})
    return {"message": "Email verified successfully! You can now log in."}


# ── FORGOT PASSWORD ────────────────────────────────────────────────────────────
@router.post("/forgot-password")
async def forgot_password(body: dict):
    db = get_db()
    email = body.get("email", "")
    user  = await db.users.find_one({"email": email})
    # Always return 200 to avoid email enumeration
    if user:
        reset_token = secrets.token_urlsafe(32)
        await db.reset_tokens.insert_one({
            "user_id": str(user["_id"]),
            "token": reset_token,
            "expires_at": datetime.utcnow().timestamp() + 3600,
        })
        send_password_reset_email(email, reset_token)
    return {"message": "If that email exists, a password reset link has been sent."}


# ── RESET PASSWORD ────────────────────────────────────────────────────────────
@router.post("/reset-password")
async def reset_password(body: dict):
    db = get_db()
    token    = body.get("token", "")
    new_pass = body.get("new_password", "")

    if len(new_pass) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    record = await db.reset_tokens.find_one({"token": token})
    if not record or datetime.utcnow().timestamp() > record["expires_at"]:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    await db.users.update_one(
        {"_id": ObjectId(record["user_id"])},
        {"$set": {"hashed_password": hash_password(new_pass), "updated_at": datetime.utcnow()}}
    )
    await db.reset_tokens.delete_one({"token": token})
    return {"message": "Password reset successfully. Please log in."}
