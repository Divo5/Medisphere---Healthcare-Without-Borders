import asyncio
from app.database.mongodb_connect import connect_db, get_db

async def check_db():
    await connect_db()
    db = get_db()
    if db is None:
        print("Failed to connect to DB")
        return
    
    doc_count = await db.doctors.count_documents({})
    med_count = await db.medicines.count_documents({})
    print(f"Doctors: {doc_count}")
    print(f"Medicines: {med_count}")
    
    if doc_count > 0:
        doc = await db.doctors.find_one({})
        print(f"Sample Doctor: {doc.get('first_name')} {doc.get('last_name')} - Verified: {doc.get('is_verified')}")
    
    if med_count > 0:
        med = await db.medicines.find_one({})
        print(f"Sample Medicine: {med.get('name')}")

if __name__ == "__main__":
    asyncio.run(check_db())
