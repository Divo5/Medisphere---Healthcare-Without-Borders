"""
MongoDB async connection using Motor driver
"""

import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    print(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    # Use certifi for SSL certificates (needed for MongoDB Atlas in some environments)
    try:
        tlsCAFile = certifi.where()
    except Exception:
        tlsCAFile = None
        
    client = AsyncIOMotorClient(
        settings.MONGODB_URL, 
        tlsCAFile=tlsCAFile,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000
    )

    db = client[settings.DB_NAME]
    try:
        # Check connection
        print("Pinging MongoDB...")
        await client.admin.command('ping')
        print("MongoDB Ping successful!")
        
        # Create indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("phone")
        await db.doctors.create_index("email", unique=True)
        await db.doctors.create_index([("specialty", 1), ("is_available", 1)])
        await db.medicines.create_index("name")
        await db.medicines.create_index("category")
        await db.orders.create_index("user_id")
        await db.orders.create_index("status")
        print(f"Connected to MongoDB: {settings.DB_NAME}")
    except Exception as e:
        print(f"MongoDB Connection Error: {e}")
        print("Backend starting with database in disconnected state. Some features may not work.")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
