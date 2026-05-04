import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./zkattend.db")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", '["http://localhost:5173", "http://localhost:3000"]')
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
    
settings = Settings()