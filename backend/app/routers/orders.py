"""
Orders Router
POST /api/orders/place          – Place order (auth required)
GET  /api/orders/my             – User's orders
GET  /api/orders/{id}           – Order detail
PUT  /api/orders/{id}/cancel    – Cancel order
GET  /api/orders/{id}/track     – Track order
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from bson import ObjectId

from app.schemas.schemas import PlaceOrderSchema
from app.models.medicine import order_template, order_helper
from app.utils.jwt_handler import get_current_user
from app.utils.email_utils import send_order_confirmation
from app.database.mongodb_connect import get_db

router = APIRouter()


@router.post("/place", response_model=dict, status_code=201)
async def place_order(
    data: PlaceOrderSchema,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    items_detail = []
    total = 0.0

    for item in data.items:
        try:
            med = await db.medicines.find_one({"_id": ObjectId(item.medicine_id)})
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid medicine ID: {item.medicine_id}")

        if not med:
            raise HTTPException(status_code=404, detail=f"Medicine not found: {item.medicine_id}")
        if not med.get("in_stock"):
            raise HTTPException(status_code=400, detail=f"{med['name']} is out of stock")
        if med.get("requires_prescription") and not data.prescription_id:
            raise HTTPException(
                status_code=400,
                detail=f"{med['name']} requires a valid prescription"
            )

        line_total = med["price"] * item.quantity
        total += line_total
        items_detail.append({
            "medicine_id": item.medicine_id,
            "name":        med["name"],
            "brand":       med["brand"],
            "quantity":    item.quantity,
            "unit_price":  med["price"],
            "total":       line_total,
        })

        # Reduce stock
        await db.medicines.update_one(
            {"_id": ObjectId(item.medicine_id)},
            {
                "$inc": {"stock_quantity": -item.quantity, "sales_count": item.quantity},
                "$set": {"in_stock": med["stock_quantity"] - item.quantity > 0}
            }
        )

    order_doc = order_template(
        user_id=current_user["user_id"],
        items=items_detail,
        total_amount=round(total, 2),
        delivery_address=data.delivery_address,
        prescription_id=data.prescription_id,
        payment_method=data.payment_method,
    )
    order_doc["estimated_delivery"] = datetime.utcnow() + timedelta(hours=4)

    result = await db.orders.insert_one(order_doc)
    order_id = str(result.inserted_id)

    # Send confirmation email
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if user:
        send_order_confirmation(user["email"], user["first_name"], order_id, total)

    return {
        "message":    "Order placed successfully!",
        "order_id":   order_id,
        "tracking_id": order_doc["tracking_id"],
        "total":      round(total, 2),
        "status":     "placed",
        "estimated_delivery": str(order_doc["estimated_delivery"]),
    }


@router.get("/my", response_model=dict)
async def my_orders(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.orders.find({"user_id": current_user["user_id"]}).sort("created_at", -1)
    orders = [order_helper(o) async for o in cursor]
    return {"total": len(orders), "data": orders}


@router.get("/addresses", response_model=dict)
async def get_previous_addresses(current_user: dict = Depends(get_current_user)):
    db = get_db()
    # Find all unique delivery addresses for this user from their previous orders
    pipeline = [
        {"$match": {"user_id": current_user["user_id"]}},
        {"$group": {"_id": "$delivery_address", "last_used": {"$max": "$created_at"}}},
        {"$sort": {"last_used": -1}},
        {"$limit": 5}
    ]
    cursor = db.orders.aggregate(pipeline)
    addresses = [doc["_id"] async for doc in cursor if doc["_id"]]
    return {"addresses": addresses}


@router.get("/{order_id}", response_model=dict)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return order_helper(order)


@router.put("/{order_id}/cancel", response_model=dict)
async def cancel_order(order_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if order["status"] in ["delivered", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel an order that is {order['status']}")

    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}}
    )
    return {"message": "Order cancelled successfully"}


@router.get("/{order_id}/track", response_model=dict)
async def track_order(order_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    status_steps = ["placed", "confirmed", "packed", "in_transit", "delivered"]
    current_idx  = status_steps.index(order["status"]) if order["status"] in status_steps else 0

    return {
        "order_id":    order_id,
        "tracking_id": order.get("tracking_id"),
        "status":      order["status"],
        "current_step": current_idx,
        "steps": [
            {"step": s, "completed": i <= current_idx, "label": s.replace("_", " ").title()}
            for i, s in enumerate(status_steps)
        ],
        "estimated_delivery": str(order.get("estimated_delivery", "")),
    }
