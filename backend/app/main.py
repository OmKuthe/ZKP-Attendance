from .api import attendance, session, auth, admin
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import init_db, AsyncSessionLocal
from .api.admin import init_default_admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    await init_db()
    
    # Initialize default admin
    async with AsyncSessionLocal() as db:
        await init_default_admin(db)
    
    yield
    # Shutdown: cleanup (nothing needed for SQLite)

app = FastAPI(title="ZKAttend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(session.router, prefix="/api/session", tags=["session"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])

@app.get("/")
async def root():
    return {
        "message": "ZKAttend backend running with SQLite",
        "version": "2.0",
        "endpoints": {
            "auth": "/api/auth",
            "admin": "/api/admin",
            "session": "/api/session",
            "attendance": "/api/attendance"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}