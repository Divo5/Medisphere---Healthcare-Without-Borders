"""
Tests for Authentication Endpoints
Run: pytest tests/ -v
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ── Health Check ─────────────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_health_check(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


# ── Register ──────────────────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_register_success(client):
    payload = {
        "first_name": "Test",
        "last_name":  "User",
        "email":      "testuser_unique@example.com",
        "phone":      "9876543210",
        "password":   "TestPass@123",
        "gender":     "male",
        "blood_group":"O+",
    }
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == payload["email"]


@pytest.mark.anyio
async def test_register_duplicate_email(client):
    payload = {
        "first_name": "Test",
        "last_name":  "User2",
        "email":      "testuser_unique@example.com",
        "phone":      "9876543211",
        "password":   "TestPass@123",
    }
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


@pytest.mark.anyio
async def test_register_weak_password(client):
    payload = {
        "first_name": "Weak",
        "last_name":  "Pass",
        "email":      "weakpass@example.com",
        "phone":      "9000000001",
        "password":   "123",
    }
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 422   # Validation error


# ── Login ─────────────────────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_login_invalid_credentials(client):
    payload = {"email": "nobody@example.com", "password": "WrongPass"}
    response = await client.post("/api/auth/login", json=payload)
    assert response.status_code == 401


# ── Doctors List ──────────────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_list_doctors(client):
    response = await client.get("/api/doctors/")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "total" in data


# ── Medicines List ────────────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_list_medicines(client):
    response = await client.get("/api/medicines/")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data


@pytest.mark.anyio
async def test_list_medicines_by_category(client):
    response = await client.get("/api/medicines/?category=Antibiotics")
    assert response.status_code == 200


# ── Protected Route without Token ─────────────────────────────────────────────
@pytest.mark.anyio
async def test_protected_route_no_token(client):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


# ── Symptom Checker ───────────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_symptom_check(client):
    payload = {
        "symptoms":    ["fever", "body aches", "headache"],
        "description": "High fever since yesterday with chills",
        "age":         28,
        "gender":      "male",
        "duration":    "2-3 days",
    }
    response = await client.post("/api/symptoms/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "risk_level" in data
    assert "conditions" in data
    assert "recommendations" in data


@pytest.mark.anyio
async def test_symptom_check_empty_symptoms(client):
    payload = {"symptoms": []}
    response = await client.post("/api/symptoms/check", json=payload)
    assert response.status_code == 422
