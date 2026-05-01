"""
Payments Router
POST /api/payments/process – Process and store payment
GET  /api/payments/history – User's payment history
"""

import razorpay
import os
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId

from app.schemas.schemas import PaymentProcessSchema, RazorpayOrderCreateSchema, RazorpayVerifySchema
from app.utils.jwt_handler import get_current_user
from app.database.mongodb_connect import get_db
from app.config import settings

router = APIRouter()

# Initialize Razorpay Client safely
try:
    RAZORPAY_KEY_ID = settings.RAZORPAY_KEY_ID
    RAZORPAY_KEY_SECRET = settings.RAZORPAY_KEY_SECRET
    
    if not RAZORPAY_KEY_ID or RAZORPAY_KEY_ID.startswith("your-"):
        print("WARNING: Razorpay keys not configured. Using mock client for development.")
        client = None
    else:
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
except Exception as e:
    print(f"ERROR: Razorpay client initialization failed: {e}")
    client = None

@router.post("/create-razorpay-order", response_model=dict)
async def create_razorpay_order(
    data: RazorpayOrderCreateSchema,
    current_user: dict = Depends(get_current_user),
):
    if not client or data.is_demo:
        # Mock order for demo mode or if explicitly requested
        import uuid
        return {
            "id": f"order_mock_{uuid.uuid4().hex[:14]}",
            "amount": int(data.amount * 100),
            "currency": data.currency,
            "demo_mode": True
        }
    
    try:
        # Amount is in paise (1 INR = 100 Paise)
        razorpay_order = client.order.create({
            "amount": int(data.amount * 100),
            "currency": data.currency,
            "payment_capture": 1
        })
        return razorpay_order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-razorpay-payment", response_model=dict)
async def verify_razorpay_payment(
    data: RazorpayVerifySchema,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    
    # Handle mock payment for demo mode
    is_mock = data.razorpay_order_id.startswith("order_mock_") or \
              data.razorpay_signature in ["demo_signature", "fallback_signature", "mock_signature"]
    
    if is_mock:
        payment_id = f"pay_mock_{ObjectId()}"
        payment_doc = {
            "user_id":        current_user["user_id"],
            "reference_id":   data.reference_id,
            "type":           data.type,
            "amount":         0.0, # Will be updated if we had amount in verify schema
            "payment_method": "razorpay_demo",
            "transaction_id": payment_id,
            "status":         "completed",
            "razorpay_order_id": data.razorpay_order_id,
            "created_at":     datetime.utcnow(),
        }
        
        # Try to find the order or appointment to get the actual amount
        if data.type == "order":
            order = await db.orders.find_one({"_id": ObjectId(data.reference_id)})
            if order: payment_doc["amount"] = order["total_amount"]
        elif data.type == "appointment":
            appt = await db.appointments.find_one({"_id": ObjectId(data.reference_id)})
            if appt: payment_doc["amount"] = appt.get("consultation_fee", 0.0)
        
        result = await db.payments.insert_one(payment_doc)
        
        # Update reference
        if data.type == "order":
            await db.orders.update_one(
                {"_id": ObjectId(data.reference_id)},
                {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
            )
        elif data.type == "appointment":
            await db.appointments.update_one(
                {"_id": ObjectId(data.reference_id)},
                {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
            )
        
        return {
            "message": "Demo Payment verified successfully",
            "payment_id": str(result.inserted_id),
            "status": "completed",
            "transaction_id": payment_id
        }

    if not client:
        raise HTTPException(status_code=500, detail="Razorpay client not configured")
    
    try:
        # Verify Signature
        params_dict = {
            'razorpay_order_id': data.razorpay_order_id,
            'razorpay_payment_id': data.razorpay_payment_id,
            'razorpay_signature': data.razorpay_signature
        }
        client.utility.verify_payment_signature(params_dict)
        
        # If signature is valid, fetch payment details to get amount
        razorpay_payment = client.payment.fetch(data.razorpay_payment_id)
        amount_paid = razorpay_payment['amount'] / 100 # Back to INR
        
        # 1. Create payment record in our DB
        payment_doc = {
            "user_id":        current_user["user_id"],
            "reference_id":   data.reference_id,
            "type":           data.type,
            "amount":         amount_paid,
            "payment_method": razorpay_payment.get('method', 'razorpay'),
            "transaction_id": data.razorpay_payment_id,
            "status":         "completed",
            "razorpay_order_id": data.razorpay_order_id,
            "created_at":     datetime.utcnow(),
        }
        
        result = await db.payments.insert_one(payment_doc)
        payment_id = str(result.inserted_id)
        
        # 2. Update the reference document (Order or Appointment)
        if data.type == "order":
            try:
                await db.orders.update_one(
                    {"_id": ObjectId(data.reference_id)},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
                )
            except Exception:
                await db.orders.update_one(
                    {"id": data.reference_id},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
                )
                
        elif data.type == "appointment":
            try:
                await db.appointments.update_one(
                    {"_id": ObjectId(data.reference_id)},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
                )
            except Exception:
                await db.appointments.update_one(
                    {"id": data.reference_id},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
                )
                
        return {
            "message": "Payment verified and processed successfully",
            "payment_id": payment_id,
            "status": "completed",
            "transaction_id": data.razorpay_payment_id
        }
        
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process", response_model=dict)
async def process_payment(
    data: PaymentProcessSchema,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    
    # 1. Create payment record
    payment_doc = {
        "user_id":        current_user["user_id"],
        "reference_id":   data.reference_id,
        "type":           data.type,
        "amount":         data.amount,
        "payment_method": data.payment_method,
        "transaction_id": data.transaction_id,
        "status":         data.status,
        "created_at":     datetime.utcnow(),
    }
    
    result = await db.payments.insert_one(payment_doc)
    payment_id = str(result.inserted_id)
    
    # 2. Update the reference document (Order or Appointment)
    if data.type == "order":
        try:
            await db.orders.update_one(
                {"_id": ObjectId(data.reference_id)},
                {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
            )
        except Exception:
            # Fallback if ID is not a valid ObjectId (might be a string for some reason)
            await db.orders.update_one(
                {"id": data.reference_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
            )
            
    elif data.type == "appointment":
        try:
            await db.appointments.update_one(
                {"_id": ObjectId(data.reference_id)},
                {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
            )
        except Exception:
            await db.appointments.update_one(
                {"id": data.reference_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.utcnow()}}
            )
            
    return {
        "message": "Payment processed successfully",
        "payment_id": payment_id,
        "status": "completed"
    }

@router.get("/history", response_model=dict)
async def payment_history(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.payments.find({"user_id": current_user["user_id"]}).sort("created_at", -1)
    
    payments = []
    async for p in cursor:
        p["id"] = str(p["_id"])
        del p["_id"]
        p["created_at"] = str(p["created_at"])
        payments.append(p)
        
    return {"total": len(payments), "data": payments}
