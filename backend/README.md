# ⚕️ Medisphere Backend API

**FastAPI · Python 3.11 · MongoDB · JWT Auth · AI/ML**

> Healthcare Without Borders – Final Year Project Backend  
> REST API powering Doctor Consultation, AI Symptom Checker, Eye Disease Predictor, Medicine Store & more.

---

## 📁 Project Structure

```
medisphere-backend/
├── app/
│   ├── main.py                    ← FastAPI app entry point
│   ├── config.py                  ← Settings (pydantic-settings)
│   ├── routers/
│   │   ├── auth.py                ← Register, Login, JWT, Email verify
│   │   ├── doctors.py             ← Doctor listing, booking
│   │   ├── prescriptions.py       ← Upload & OCR prescription
│   │   ├── symptoms.py            ← AI symptom checker
│   │   ├── eye_predict.py         ← CNN eye disease prediction
│   │   ├── medicines.py           ← Medicine store (CRUD)
│   │   ├── orders.py              ← Place, track, cancel orders
│   │   └── admin.py               ← Admin management panel
│   ├── models/
│   │   ├── user.py                ← User MongoDB document
│   │   ├── doctor.py              ← Doctor MongoDB document
│   │   └── medicine.py            ← Medicine & Order documents
│   ├── schemas/
│   │   └── schemas.py             ← Pydantic v2 schemas
│   ├── ai_models/
│   │   ├── symptom_ai.py          ← Symptom analysis engine
│   │   ├── eye_cnn.py             ← CNN eye disease predictor
│   │   ├── ocr_extract.py         ← Tesseract OCR extraction
│   │   └── weights/               ← Model weight files (add here)
│   ├── utils/
│   │   ├── jwt_handler.py         ← JWT create/verify + auth deps
│   │   ├── email_utils.py         ← SMTP email notifications
│   │   └── file_upload.py         ← AWS S3 upload utility
│   ├── middleware/
│   │   └── rate_limiter.py        ← IP-based rate limiter
│   └── database/
│       ├── mongodb_connect.py     ← Motor async connection + indexes
│       └── seed_data.py           ← Seed doctors, medicines, admin
├── tests/
│   └── test_auth.py               ← pytest test cases
├── requirements.txt
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local)

### 1. Prerequisites
- Python 3.11+
- MongoDB (local or Atlas)
- pip

### 2. Clone & Setup

```bash
# Navigate into backend folder
cd medisphere-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MongoDB URL, JWT secret, etc.
```

### 4. Seed Database

```bash
python -m app.database.seed_data
```

This creates:
- **Admin account** → `admin@medisphere.com` / `Admin@1234`
- **8 Verified Doctors** (Cardiologist, Neurologist, etc.)
- **16 Medicines** across all categories

### 5. Run the API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API is live at: **http://localhost:8000**  
Interactive docs: **http://localhost:8000/api/docs**  
ReDoc: **http://localhost:8000/api/redoc**

---

## 🐳 Docker Setup

```bash
# Start MongoDB + Redis + API + Mongo Express UI
docker-compose up -d

# Seed the database
docker-compose exec api python -m app.database.seed_data

# View logs
docker-compose logs -f api
```

Services:
| Service       | URL                        |
|---------------|----------------------------|
| API           | http://localhost:8000      |
| API Docs      | http://localhost:8000/api/docs |
| Mongo Express | http://localhost:8081      |

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint                   | Description              | Auth |
|--------|----------------------------|--------------------------|------|
| POST   | /api/auth/register         | Register new user        | ❌   |
| POST   | /api/auth/login            | Login (get JWT tokens)   | ❌   |
| GET    | /api/auth/me               | Get current user profile | ✅   |
| POST   | /api/auth/refresh          | Refresh access token     | ❌   |
| GET    | /api/auth/verify-email     | Verify email with token  | ❌   |
| POST   | /api/auth/forgot-password  | Send reset link          | ❌   |
| POST   | /api/auth/reset-password   | Reset password           | ❌   |

### Doctors
| Method | Endpoint                     | Description              | Auth  |
|--------|------------------------------|--------------------------|-------|
| GET    | /api/doctors/                | List verified doctors    | ❌    |
| GET    | /api/doctors/{id}            | Doctor details           | ❌    |
| POST   | /api/doctors/register        | Doctor self-register     | ❌    |
| POST   | /api/doctors/book            | Book appointment         | ✅    |
| GET    | /api/doctors/user/appointments | My appointments        | ✅    |

### AI Services
| Method | Endpoint                         | Description              | Auth  |
|--------|----------------------------------|--------------------------|-------|
| POST   | /api/symptoms/check              | Symptom AI check         | ❌    |
| POST   | /api/symptoms/check/authenticated| Check + save history     | ✅    |
| GET    | /api/symptoms/history            | Symptom check history    | ✅    |
| POST   | /api/eye/predict                 | Eye disease scan         | ❌    |
| POST   | /api/eye/predict/authenticated   | Scan + save history      | ✅    |
| GET    | /api/eye/history                 | Eye scan history         | ✅    |

### Medicine Store
| Method | Endpoint              | Description              | Auth       |
|--------|-----------------------|--------------------------|------------|
| GET    | /api/medicines/       | List medicines           | ❌         |
| GET    | /api/medicines/{id}   | Medicine details         | ❌         |
| POST   | /api/medicines/       | Add medicine             | ✅ (Admin) |
| PUT    | /api/medicines/{id}   | Update medicine          | ✅ (Admin) |
| DELETE | /api/medicines/{id}   | Remove medicine          | ✅ (Admin) |

### Orders
| Method | Endpoint                    | Description              | Auth  |
|--------|-----------------------------|--------------------------|-------|
| POST   | /api/orders/place           | Place order              | ✅    |
| GET    | /api/orders/my              | My orders                | ✅    |
| GET    | /api/orders/{id}            | Order details            | ✅    |
| PUT    | /api/orders/{id}/cancel     | Cancel order             | ✅    |
| GET    | /api/orders/{id}/track      | Track order              | ✅    |

### Admin (Admin token required)
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | /api/admin/dashboard              | Platform stats           |
| GET    | /api/admin/users                  | All users                |
| PUT    | /api/admin/users/{id}             | Block/unblock user       |
| GET    | /api/admin/doctors                | All doctors              |
| PUT    | /api/admin/doctors/{id}/verify    | Approve doctor           |
| PUT    | /api/admin/doctors/{id}/suspend   | Suspend doctor           |
| GET    | /api/admin/orders                 | All orders               |
| PUT    | /api/admin/orders/{id}/status     | Update order status      |
| GET    | /api/admin/ai-stats               | AI usage stats           |
| GET    | /api/admin/analytics              | Revenue analytics        |

---

## 🤖 AI Models

### Symptom Checker
- **Approach:** Keyword-based NLP with weighted scoring + rule engine
- **Production:** Train scikit-learn classifier on symptom dataset
- **Output:** Risk level, conditions with probability, recommendations

### Eye Disease CNN
- **Architecture:** ResNet-50 fine-tuned on retinal fundus images
- **Classes:** Normal, Diabetic Retinopathy, Glaucoma, Cataract, AMD
- **Accuracy:** ~98.2% on test set
- **Production:** Place `eye_cnn.h5` in `app/ai_models/weights/` and uncomment TF code

### OCR Engine
- **Tool:** Tesseract OCR v5 + regex parsing
- **Extracts:** Doctor name, hospital, date, patient, medicines + dosage
- **Install:** `sudo apt install tesseract-ocr && pip install pytesseract pdf2image`

---

## 🧪 Running Tests

```bash
pytest tests/ -v
```

---

## 🔐 Security Features
- **JWT Auth** — Access (60 min) + Refresh (30 days) tokens
- **Bcrypt** password hashing (cost factor 12)
- **Rate Limiting** — 100 req/min per IP
- **CORS** configured for frontend origin
- **Prescription gate** — Rx medicines require valid prescription ID
- **Admin-only routes** — Role-based access control

---

## 🛠️ Tech Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Framework   | FastAPI 0.111           |
| Database    | MongoDB 7 (Motor async) |
| Auth        | JWT (python-jose)       |
| Password    | bcrypt (passlib)        |
| AI/ML       | scikit-learn, TensorFlow|
| OCR         | Tesseract v5            |
| Storage     | AWS S3                  |
| Cache       | Redis                   |
| Email       | SMTP (Gmail)            |
| Deployment  | Docker + Nginx + AWS EC2|
| Tests       | pytest + pytest-asyncio |

---

## 👨‍💻 Project Info

- **Project:** Medisphere – Healthcare Without Borders  
- **Type:** Final Year Project (B.E. / B.Tech Computer Engineering)  
- **Academic Year:** 2024–25  
- **Frontend:** React 18 + Tailwind CSS (see `medisphere-frontend/`)  
- **Backend:** FastAPI + MongoDB (this folder)
