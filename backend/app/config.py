"""
Application settings loaded from .env
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Medisphere"
    DEBUG: bool = False
    SECRET_KEY: str 

    # MongoDB
    MONGODB_URL: str
    DB_NAME: str = "medisphere_db"

    # JWT
    JWT_SECRET: str 
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # AWS S3 (for prescription/image uploads)
    AWS_ACCESS_KEY: str = ""
    AWS_SECRET_KEY: str = ""
    AWS_BUCKET_NAME: str = "medisphere-uploads"
    AWS_REGION: str = "ap-south-1"

    # Cloudinary (alternative to S3)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # Redis (for caching & rate limiting)
    REDIS_URL: str = "redis://localhost:6379"

    # AI Models
    SYMPTOM_MODEL_PATH: str = "app/ai_models/weights/symptom_model.pkl"
    EYE_MODEL_PATH: str = "app/ai_models/weights/eye_cnn.h5"

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
