import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
import urllib.parse

from app.config import settings

# Use the same hashing as the app
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init_admin():
    # Use the connection string from .env
    mongo_url = settings.MONGODB_URL
    db_name = settings.DB_NAME
    
    # mongodb+srv requires certifi sometimes in local env
    try:
        import certifi
        tlsCAFile = certifi.where()
    except ImportError:
        tlsCAFile = None
    
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=tlsCAFile)
    db = client[db_name]
    
    admin_email = "Divyesh@medisphere.com"
    admin_password = "Divyesh@123"
    
    # Check if admin exists
    try:
        # Also check for the old admin email and update it if found
        await db.users.delete_many({"email": "admin@medisphere.com"})
        
        existing = await db.users.find_one({"email": admin_email})
        
        if not existing:
            admin_doc = {
                "first_name": "Divyesh",
                "last_name": "Medisphere",
                "email": admin_email,
                "hashed_password": pwd_context.hash(admin_password),
                "password": admin_password, # Store plain text as requested by user previously
                "phone": "9999999999",
                "role": "admin",
                "is_active": True,
                "is_verified": True,
                "created_at": None 
            }
            await db.users.insert_one(admin_doc)
            print(f"Admin user created: {admin_email}")
        else:
            # Update password and role
            await db.users.update_one(
                {"email": admin_email}, 
                {"$set": {
                    "role": "admin", 
                    "is_active": True,
                    "hashed_password": pwd_context.hash(admin_password),
                    "password": admin_password
                }}
            )
            print(f"Admin user updated: {admin_email}")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_admin())
