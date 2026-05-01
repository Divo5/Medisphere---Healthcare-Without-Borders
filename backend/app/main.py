"""
Medisphere – Healthcare Without Borders
FastAPI Backend Entry Point
Final Year Project | 2024–25
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os

from app.database.mongodb_connect import connect_db, close_db
from app.routers import auth, doctors, prescriptions, symptoms, eye_predict, medicines, orders, admin, payments
from app.middleware.rate_limiter import RateLimitMiddleware


# ── Lifespan (startup / shutdown) ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        # Create storage directories
        os.makedirs("storage/prescriptions", exist_ok=True)
        os.makedirs("storage/eye_scans", exist_ok=True)
        os.makedirs("storage/profiles", exist_ok=True)
        
        await connect_db()
        print("MongoDB startup sequence completed")
    except Exception as e:
        print(f"Startup warning: {e}")
    yield
    # Shutdown
    try:
        await close_db()
        print("MongoDB shutdown sequence completed")
    except Exception as e:
        print(f"Shutdown warning: {e}")


# ── App Instance ────────────────────────────────────────────────────────────
app = FastAPI(
    title="Medisphere API",
    description="AI-powered healthcare platform – Doctor Consultation, Symptom Checker, Eye Disease AI, Medicine Store",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)


# ── Middleware ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)


# ── Static Files ─────────────────────────────────────────────────────────────
os.makedirs("storage", exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")


# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router,         prefix="/api/auth",       tags=["Authentication"])
app.include_router(doctors.router,      prefix="/api/doctors",    tags=["Doctors"])
app.include_router(prescriptions.router,prefix="/api/prescriptions",tags=["Prescriptions"])
app.include_router(symptoms.router,     prefix="/api/symptoms",   tags=["Symptom Checker AI"])
app.include_router(eye_predict.router,  prefix="/api/eye",        tags=["Eye Disease AI"])
app.include_router(medicines.router,    prefix="/api/medicines",  tags=["Medicine Store"])
app.include_router(orders.router,       prefix="/api/orders",     tags=["Orders"])
app.include_router(payments.router,     prefix="/api/payments",   tags=["Payments"])
app.include_router(admin.router,        prefix="/api/admin",      tags=["Admin"])


# ── Health Check ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "ok",
        "message": "Medisphere API is running 🏥",
        "version": "1.0.0",
        "docs": "/api/docs",
    }

@app.get("/api", tags=["Health"])
async def api_root():
    return {
        "status": "ok",
        "message": "Medisphere API Base URL",
        "docs": "/api/docs",
        "health": "/api/health"
    }

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "medisphere-api"}


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
