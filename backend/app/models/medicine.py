"""
Medicine & Order MongoDB models
"""

from datetime import datetime
from typing import List, Optional


MEDICINE_CATEGORIES = [
    "Antibiotics", "Vitamins", "OTC", "Ayurvedic",
    "Baby Care", "Diabetes", "Cardiac", "Pain Relief",
    "Skin Care", "Eye Ear", "Surgical", "Psychiatry",
]

ORDER_STATUSES = ["placed", "confirmed", "packed", "in_transit", "delivered", "cancelled", "returned"]


# ── MEDICINE ──────────────────────────────────────────────────────────────────

def medicine_template(
    name: str,
    brand: str,
    generic_name: str,
    category: str,
    price: float,
    mrp: float,
    unit: str,
    description: str,
    manufacturer: str = "",
    composition: str = "",
    dosage: str = "",
    side_effects: str = "",
    requires_prescription: bool = False,
    stock_quantity: int = 100,
    image_url: str = "",
    tags: List[str] = [],
) -> dict:
    return {
        "name": name,
        "brand": brand,
        "generic_name": generic_name,
        "category": category,
        "price": price,
        "mrp": mrp,
        "discount_percent": round((1 - price / mrp) * 100, 1),
        "unit": unit,
        "description": description,
        "manufacturer": manufacturer,
        "composition": composition,
        "dosage": dosage,
        "side_effects": side_effects,
        "requires_prescription": requires_prescription,
        "stock_quantity": stock_quantity,
        "in_stock": stock_quantity > 0,
        "image_url": image_url,
        "tags": tags,
        "sales_count": 0,
        "rating": 0.0,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


def medicine_helper(med: dict) -> dict:
    return {
        "id": str(med["_id"]),
        "name": med.get("name", ""),
        "brand": med.get("brand", ""),
        "generic_name": med.get("generic_name", ""),
        "category": med.get("category", ""),
        "price": med.get("price", 0),
        "mrp": med.get("mrp", 0),
        "discount_percent": med.get("discount_percent", 0),
        "unit": med.get("unit", ""),
        "description": med.get("description", ""),
        "requires_prescription": med.get("requires_prescription", False),
        "stock_quantity": med.get("stock_quantity", 0),
        "in_stock": med.get("in_stock", False),
        "image_url": med.get("image_url", ""),
        "sales_count": med.get("sales_count", 0),
        "rating": med.get("rating", 0),
        "created_at": str(med.get("created_at", "")),
    }


# ── ORDER ─────────────────────────────────────────────────────────────────────

def order_template(
    user_id: str,
    items: List[dict],        # [{medicine_id, name, quantity, price}]
    total_amount: float,
    delivery_address: str,
    prescription_id: Optional[str] = None,
    payment_method: str = "cod",
) -> dict:
    return {
        "user_id": user_id,
        "items": items,
        "total_amount": total_amount,
        "delivery_address": delivery_address,
        "prescription_id": prescription_id,
        "payment_method": payment_method,
        "payment_status": "pending",
        "status": "placed",
        "tracking_id": f"TRK{int(datetime.utcnow().timestamp())}",
        "estimated_delivery": None,
        "notes": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


def order_helper(order: dict) -> dict:
    return {
        "id": str(order["_id"]),
        "user_id": order.get("user_id", ""),
        "items": order.get("items", []),
        "total_amount": order.get("total_amount", 0),
        "delivery_address": order.get("delivery_address", ""),
        "prescription_id": order.get("prescription_id"),
        "payment_method": order.get("payment_method", "cod"),
        "payment_status": order.get("payment_status", "pending"),
        "status": order.get("status", "placed"),
        "tracking_id": order.get("tracking_id", ""),
        "estimated_delivery": str(order.get("estimated_delivery", "")),
        "created_at": str(order.get("created_at", "")),
    }
