"""
Database Seed Script
Run: python -m app.database.seed_data
Populates: doctors, medicines, one admin user
"""

import asyncio

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from app.config import settings
from app.models.user import user_template
from app.models.doctor import doctor_template
from app.models.medicine import medicine_template
from app.utils.jwt_handler import hash_password


async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db     = client[settings.DB_NAME]

    print("Seeding database...")

    # ── ADMIN USER ─────────────────────────────────────────────────────────────
    existing_admin = await db.users.find_one({"email": "admin@medisphere.com"})
    if not existing_admin:
        admin = user_template(
            first_name="Admin",
            last_name="Medisphere",
            email="admin@medisphere.com",
            hashed_password=hash_password("Admin@1234"),
            phone="9000000000",
        )
        admin["role"]        = "admin"
        admin["is_verified"] = True
        await db.users.insert_one(admin)
        print("  Admin user created -> admin@medisphere.com / Admin@1234")
    else:
        print("  Admin already exists")

    # -- DOCTORS ---------------------------------------------------------------
    # Clear existing doctors to ensure clean data
    await db.doctors.delete_many({})
    print("  Cleared existing doctors")

    doctors_data = [
        dict(first_name="Priya",  last_name="Sharma",  email="priya.sharma@medisphere.com",  specialty="Cardiologist",      qualification="MBBS, MD",           experience_years=12, consultation_fee=500,  modes=["video","chat"],    tags=["Heart Health","ECG","Hypertension"]),
        dict(first_name="Arjun",  last_name="Mehta",   email="arjun.mehta@medisphere.com",   specialty="Neurologist",       qualification="MBBS, DM Neurology", experience_years=8,  consultation_fee=700,  modes=["video"],           tags=["Migraine","Epilepsy","Stroke"]),
        dict(first_name="Sneha",  last_name="Gupta",   email="sneha.gupta@medisphere.com",   specialty="Dermatologist",     qualification="MBBS, MD Derma",     experience_years=6,  consultation_fee=400,  modes=["video","chat"],    tags=["Acne","Eczema","Psoriasis"]),
        dict(first_name="Ravi",   last_name="Nair",    email="ravi.nair@medisphere.com",     specialty="Orthopedic",        qualification="MBBS, MS Ortho",     experience_years=15, consultation_fee=800,  modes=["in_clinic"],       tags=["Knee","Spine","Fracture"]),
        dict(first_name="Anita",  last_name="Desai",   email="anita.desai@medisphere.com",   specialty="Pediatrician",      qualification="MBBS, DCH",          experience_years=9,  consultation_fee=450,  modes=["video","chat"],    tags=["Child Health","Vaccination","Fever"]),
        dict(first_name="Kiran",  last_name="Shah",    email="kiran.shah@medisphere.com",    specialty="Ophthalmologist",   qualification="MBBS, MS Ophthal",   experience_years=11, consultation_fee=600,  modes=["video","in_clinic"],tags=["Retina","Glaucoma","Cataract"]),
        dict(first_name="Meera",  last_name="Pillai",  email="meera.pillai@medisphere.com",  specialty="Psychiatrist",      qualification="MBBS, MD Psychiatry",experience_years=7,  consultation_fee=750,  modes=["video","chat"],    tags=["Anxiety","Depression","OCD"]),
        dict(first_name="Rohit",  last_name="Verma",   email="rohit.verma@medisphere.com",   specialty="General Physician", qualification="MBBS",               experience_years=5,  consultation_fee=300,  modes=["video","chat","in_clinic"], tags=["General","Fever","Diabetes"]),
    ]

    inserted_doctors = 0
    for d in doctors_data:
        if not await db.doctors.find_one({"email": d["email"]}):
            doc = doctor_template(
                hashed_password=hash_password("Doctor@1234"),
                hospital="City Medical Centre, Ahmedabad",
                location="Ahmedabad, Gujarat",
                languages=["English", "Hindi", "Gujarati"],
                **d,
            )
            doc["is_verified"]      = True
            doc["is_available"]     = True
            doc["rating"]           = round(4.5 + (hash(d["email"]) % 5) * 0.1, 1)
            doc["total_reviews"]    = 100 + abs(hash(d["first_name"])) % 400
            doc["total_consultations"] = 50 + abs(hash(d["last_name"])) % 500
            doc["wait_time_minutes"]= 5 + (abs(hash(d["specialty"])) % 30)
            await db.doctors.insert_one(doc)
            inserted_doctors += 1
    print(f"  {inserted_doctors} doctors seeded")

    # -- MEDICINES -------------------------------------------------------------
    # Clear existing medicines to ensure clean data
    await db.medicines.delete_many({})
    print("  Cleared existing medicines")

    medicines_data = [
        dict(name="Paracetamol 500mg",     brand="Crocin",         generic_name="Paracetamol",     category="OTC",          price=25,  mrp=30,  unit="Strip of 15 tabs", description="Fever & mild to moderate pain relief",         requires_prescription=False, stock_quantity=850,  tags=["fever","pain"]),
        dict(name="Amoxicillin 250mg",     brand="Mox 250",        generic_name="Amoxicillin",     category="Antibiotics",  price=85,  mrp=100, unit="Strip of 10 caps", description="Broad-spectrum antibiotic for bacterial infections",requires_prescription=True,  stock_quantity=12,   tags=["antibiotic","infection"]),
        dict(name="Vitamin D3 1000 IU",    brand="Calshine D3",    generic_name="Cholecalciferol", category="Vitamins",     price=120, mrp=150, unit="60 tablets",       description="Bone health, immunity, and calcium absorption",  requires_prescription=False, stock_quantity=345,  tags=["vitamin","bone"]),
        dict(name="Metformin 500mg",       brand="Glycomet",       generic_name="Metformin HCl",   category="Diabetes",     price=45,  mrp=55,  unit="Strip of 20 tabs", description="Type 2 Diabetes blood glucose management",       requires_prescription=True,  stock_quantity=200,  tags=["diabetes","sugar"]),
        dict(name="Ibuprofen 400mg",       brand="Brufen",         generic_name="Ibuprofen",       category="Pain Relief",  price=35,  mrp=42,  unit="Strip of 15 tabs", description="Pain, fever and inflammation relief (NSAID)",    requires_prescription=False, stock_quantity=400,  tags=["pain","inflammation"]),
        dict(name="Ashwagandha 500mg",     brand="Himalaya",       generic_name="Withania somnifera",category="Ayurvedic",  price=195, mrp=230, unit="60 capsules",      description="Adaptogen for stress, energy and immunity",      requires_prescription=False, stock_quantity=180,  tags=["stress","energy","ayurvedic"]),
        dict(name="Ciprofloxacin 500mg",   brand="Cifran",         generic_name="Ciprofloxacin",   category="Antibiotics",  price=95,  mrp=115, unit="Strip of 10 tabs", description="Fluoroquinolone antibiotic for bacterial infections",requires_prescription=True, stock_quantity=0,    tags=["antibiotic","UTI"]),
        dict(name="Diaper Rash Cream",     brand="Sebamed",        generic_name="Zinc Oxide Cream",category="Baby Care",    price=285, mrp=320, unit="100g tube",        description="Gentle zinc-based cream for baby diaper rash",   requires_prescription=False, stock_quantity=90,   tags=["baby","skin","rash"]),
        dict(name="Lubricant Eye Drops",   brand="Tears Naturale", generic_name="Carboxymethylcellulose",category="Eye Ear",price=75, mrp=90,  unit="10ml bottle",      description="Dry eye relief lubricant drops",                 requires_prescription=False, stock_quantity=220,  tags=["eye","dry eye"]),
        dict(name="Omega-3 Fish Oil",      brand="Dr. Morepen",    generic_name="Omega-3 Fatty Acids",category="Vitamins",  price=320, mrp=380, unit="60 softgels",      description="Heart and brain health supplementation",         requires_prescription=False, stock_quantity=150,  tags=["heart","brain","omega"]),
        dict(name="Atorvastatin 10mg",     brand="Storvas",        generic_name="Atorvastatin",    category="Cardiac",      price=55,  mrp=65,  unit="Strip of 10 tabs", description="Cholesterol-lowering statin therapy",            requires_prescription=True,  stock_quantity=280,  tags=["cholesterol","heart"]),
        dict(name="Betadine Solution",     brand="Win-Medicare",   generic_name="Povidone-Iodine", category="Surgical",     price=65,  mrp=80,  unit="100ml bottle",     description="Broad-spectrum antiseptic for wound care",       requires_prescription=False, stock_quantity=310,  tags=["antiseptic","wound","first aid"]),
        dict(name="Cetirizine 10mg",       brand="Zyrtec",         generic_name="Cetirizine HCl",  category="OTC",          price=30,  mrp=38,  unit="Strip of 10 tabs", description="Non-drowsy antihistamine for allergies",         requires_prescription=False, stock_quantity=500,  tags=["allergy","antihistamine"]),
        dict(name="Pantoprazole 40mg",     brand="Pan 40",         generic_name="Pantoprazole",    category="OTC",          price=40,  mrp=50,  unit="Strip of 15 tabs", description="Proton pump inhibitor for acidity and GERD",     requires_prescription=False, stock_quantity=420,  tags=["acidity","stomach","GERD"]),
        dict(name="Azithromycin 500mg",    brand="Azithral",       generic_name="Azithromycin",    category="Antibiotics",  price=110, mrp=130, unit="Strip of 3 tabs",  description="Macrolide antibiotic for respiratory infections", requires_prescription=True,  stock_quantity=60,   tags=["antibiotic","respiratory"]),
        dict(name="Insulin Glargine 100IU",brand="Lantus",         generic_name="Insulin Glargine",category="Diabetes",     price=850, mrp=950, unit="3ml vial",         description="Long-acting insulin for type 1 & 2 diabetes",    requires_prescription=True,  stock_quantity=40,   tags=["insulin","diabetes"]),
        dict(name="Montelukast 10mg",      brand="Singulair",      generic_name="Montelukast",     category="Respiratory",  price=140, mrp=165, unit="Strip of 10 tabs", description="Maintenance treatment for asthma and allergic rhinitis", requires_prescription=True, stock_quantity=120,  tags=["asthma","allergy"]),
        dict(name="Salbutamol Inhaler",    brand="Asthalin",       generic_name="Salbutamol",      category="Respiratory",  price=180, mrp=210, unit="200 mdi",          description="Relief of bronchospasm in asthma and COPD",      requires_prescription=True, stock_quantity=85,   tags=["asthma","inhaler"]),
        dict(name="Latanoprost Drops",     brand="Xalatan",        generic_name="Latanoprost",     category="Eye & Ear",    price=450, mrp=520, unit="2.5ml bottle",     description="Reduction of elevated intraocular pressure in glaucoma", requires_prescription=True, stock_quantity=45, tags=["glaucoma","eye"]),
        dict(name="Sunscreen SPF 50",      brand="La Shield",      generic_name="Sunscreen Gel",   category="Skin Care",    price=650, mrp=790, unit="60g tube",         description="Broad-spectrum protection against UVA and UVB rays", requires_prescription=False, stock_quantity=300, tags=["sunscreen","skin"]),
        dict(name="Vitamin C 500mg",       brand="Limcee",         generic_name="Ascorbic Acid",   category="Supplements",  price=30,  mrp=35,  unit="Strip of 15 tabs", description="Immunity booster and antioxidant supplement",    requires_prescription=False, stock_quantity=1200, tags=["vitamin c","immunity"]),
        dict(name="Hand Sanitizer",        brand="Dettol",         generic_name="Ethyl Alcohol",   category="Personal Care",price=50,  mrp=60,  unit="50ml bottle",      description="Instant germ protection on the go",              requires_prescription=False, stock_quantity=1500, tags=["sanitizer","hygiene"]),
    ]

    inserted_meds = 0
    for m in medicines_data:
        if not await db.medicines.find_one({"name": m["name"]}):
            doc = medicine_template(**m)
            doc["sales_count"] = abs(hash(m["name"])) % 1200
            doc["rating"]      = round(3.8 + (abs(hash(m["brand"])) % 12) * 0.1, 1)
            await db.medicines.insert_one(doc)
            inserted_meds += 1
    print(f"  {inserted_meds} medicines seeded")

    client.close()
    print("Database seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())
