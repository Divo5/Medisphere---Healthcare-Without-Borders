"""
Medicines Router
GET  /api/medicines           – List medicines (public)
GET  /api/medicines/{id}      – Single medicine
GET  /api/medicines/search    – Search medicines
POST /api/medicines           – Add medicine (admin)
PUT  /api/medicines/{id}      – Update medicine (admin)
DELETE /api/medicines/{id}    – Delete medicine (admin)
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from bson import ObjectId

from app.models.medicine import medicine_template, medicine_helper, order_template, order_helper
from app.schemas.schemas import PlaceOrderSchema
from app.utils.jwt_handler import get_current_user, get_current_admin
from app.utils.email_utils import send_order_confirmation
from app.database.mongodb_connect import get_db

router = APIRouter()


# ── LIST MEDICINES ─────────────────────────────────────────────────────────────
@router.get("/", response_model=dict)
async def list_medicines(
    category: Optional[str] = None,
    search:   Optional[str] = None,
    in_stock: Optional[bool] = None,
    rx:       Optional[bool] = None,
    sort_by:  str = Query("name", regex="^(name|price|sales_count)$"),
    order:    str = Query("asc", regex="^(asc|desc)$"),
    page:     int = Query(1, ge=1),
    limit:    int = Query(20, ge=1, le=100),
):
    db = get_db()
    if db is None:
        # Fallback mock data when DB is disconnected
        mock_medicines = [
            {"id": "med1", "name": "Paracetamol 500mg", "brand": "Crocin", "category": "OTC", "price": 25, "mrp": 30, "unit": "Strip of 15 tabs", "in_stock": True, "requires_prescription": False, "rating": 4.8},
            {"id": "med2", "name": "Amoxicillin 250mg", "brand": "Mox 250", "category": "Antibiotics", "price": 85, "mrp": 100, "unit": "Strip of 10 caps", "in_stock": True, "requires_prescription": True, "rating": 4.5},
            {"id": "med3", "name": "Vitamin D3 1000 IU", "brand": "Calshine D3", "category": "Vitamins", "price": 120, "mrp": 150, "unit": "60 tablets", "in_stock": True, "requires_prescription": False, "rating": 4.9},
            {"id": "med4", "name": "Montelukast 10mg", "brand": "Singulair", "category": "Respiratory", "price": 140, "mrp": 165, "unit": "Strip of 10 tabs", "in_stock": True, "requires_prescription": True, "rating": 4.7},
            {"id": "med5", "name": "Sunscreen SPF 50", "brand": "La Shield", "category": "Skin Care", "price": 650, "mrp": 790, "unit": "60g tube", "in_stock": True, "requires_prescription": False, "rating": 4.6},
            {"id": "med6", "name": "Vitamin C 500mg", "brand": "Limcee", "category": "Supplements", "price": 30, "mrp": 35, "unit": "Strip of 15 tabs", "in_stock": True, "requires_prescription": False, "rating": 4.8},
            {"id": "med7", "name": "Atorvastatin 10mg", "brand": "Storvas", "category": "Cardiac", "price": 55, "mrp": 65, "unit": "Strip of 10 tabs", "in_stock": True, "requires_prescription": True, "rating": 4.7},
            {"id": "med8", "name": "Ashwagandha 500mg", "brand": "Himalaya", "category": "Ayurvedic", "price": 195, "mrp": 230, "unit": "60 capsules", "in_stock": True, "requires_prescription": False, "rating": 4.9},
        ]
        
        # Apply filters to mock data
        filtered_mock = mock_medicines
        if category and category != 'All':
            filtered_mock = [m for m in filtered_mock if m['category'].lower() == category.lower()]
        if search:
            s = search.lower()
            filtered_mock = [m for m in filtered_mock if s in m['name'].lower() or s in m['brand'].lower()]
            
        return {
            "total": len(filtered_mock),
            "page": page,
            "limit": limit,
            "data": filtered_mock,
            "message": "Database disconnected. Using mock data."
        }
    query: dict = {"is_active": True}

    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if search:
        query["$or"] = [
            {"name":         {"$regex": search, "$options": "i"}},
            {"brand":        {"$regex": search, "$options": "i"}},
            {"generic_name": {"$regex": search, "$options": "i"}},
        ]
    if in_stock is not None:
        query["in_stock"] = in_stock
    if rx is not None:
        query["requires_prescription"] = rx

    sort_dir  = 1 if order == "asc" else -1
    skip      = (page - 1) * limit
    total     = await db.medicines.count_documents(query)
    cursor    = db.medicines.find(query).skip(skip).limit(limit).sort(sort_by, sort_dir)
    medicines = [medicine_helper(m) async for m in cursor]

    return {"total": total, "page": page, "limit": limit, "data": medicines}


# ── GET SINGLE MEDICINE ───────────────────────────────────────────────────────
@router.get("/{med_id}", response_model=dict)
async def get_medicine(med_id: str):
    db = get_db()
    try:
        med = await db.medicines.find_one({"_id": ObjectId(med_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid medicine ID")
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine_helper(med)


# ── ADD MEDICINE (ADMIN) ──────────────────────────────────────────────────────
@router.post("/", response_model=dict, status_code=201)
async def add_medicine(data: dict, _: dict = Depends(get_current_admin)):
    db = get_db()
    # Ensure required generic_name is present
    if "generic_name" not in data:
        data["generic_name"] = data.get("name", "Generic Medicine")
    doc = medicine_template(**data)
    result = await db.medicines.insert_one(doc)
    return {"message": "Medicine added", "id": str(result.inserted_id)}


# ── UPDATE MEDICINE (ADMIN) ───────────────────────────────────────────────────
@router.put("/{med_id}", response_model=dict)
async def update_medicine(med_id: str, data: dict, _: dict = Depends(get_current_admin)):
    db = get_db()
    data["updated_at"] = datetime.utcnow()
    if "stock_quantity" in data:
        data["in_stock"] = data["stock_quantity"] > 0
    await db.medicines.update_one({"_id": ObjectId(med_id)}, {"$set": data})
    return {"message": "Medicine updated"}


# ── DELETE MEDICINE (ADMIN) ───────────────────────────────────────────────────
@router.delete("/{med_id}", response_model=dict)
async def delete_medicine(med_id: str, _: dict = Depends(get_current_admin)):
    db = get_db()
    await db.medicines.update_one({"_id": ObjectId(med_id)}, {"$set": {"is_active": False}})
    return {"message": "Medicine removed from store"}
