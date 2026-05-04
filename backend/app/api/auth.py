from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import secrets
from passlib.context import CryptContext

from ..database import get_db
from ..models import User

router = APIRouter(prefix="/api/auth", tags=["authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory session store (replace with Redis/DB in production)
active_sessions = {}

class FacultyLogin(BaseModel):
    faculty_id: str
    password: str

class StudentLogin(BaseModel):
    student_id: str

class LoginResponse(BaseModel):
    token: str
    user_type: str
    user_id: str
    full_name: str
    expires_at: str

@router.post("/faculty/login", response_model=LoginResponse)
async def faculty_login(
    login: FacultyLogin,
    db: AsyncSession = Depends(get_db)
):
    # Check in database
    result = await db.execute(
        select(User).where(
            and_(User.user_id == login.faculty_id, User.user_type == "faculty")
        )
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(login.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(hours=8)
    
    active_sessions[token] = {
        "user_id": user.user_id,
        "user_type": "faculty",
        "full_name": user.full_name,
        "expires": expires_at
    }
    
    return LoginResponse(
        token=token,
        user_type="faculty",
        user_id=user.user_id,
        full_name=user.full_name,
        expires_at=expires_at.isoformat()
    )

@router.post("/student/login", response_model=LoginResponse)
async def student_login(
    login: StudentLogin,
    db: AsyncSession = Depends(get_db)
):
    # Verify student exists in database
    result = await db.execute(
        select(User).where(
            and_(User.user_id == login.student_id, User.user_type == "student")
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid student ID")
    
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(hours=4)
    
    active_sessions[token] = {
        "user_id": user.user_id,
        "user_type": "student",
        "full_name": user.full_name,
        "expires": expires_at
    }
    
    # Get student details if needed
    student_name = user.full_name
    
    return LoginResponse(
        token=token,
        user_type="student",
        user_id=user.user_id,
        full_name=student_name,
        expires_at=expires_at.isoformat()
    )

@router.post("/admin/login", response_model=LoginResponse)
async def admin_login(
    login: FacultyLogin,  # Reuse same schema
    db: AsyncSession = Depends(get_db)
):
    # Check in database
    result = await db.execute(
        select(User).where(
            and_(User.user_id == login.faculty_id, User.user_type == "admin")
        )
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(login.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(hours=8)
    
    active_sessions[token] = {
        "user_id": user.user_id,
        "user_type": "admin",
        "full_name": user.full_name,
        "expires": expires_at
    }
    
    return LoginResponse(
        token=token,
        user_type="admin",
        user_id=user.user_id,
        full_name=user.full_name,
        expires_at=expires_at.isoformat()
    )

@router.post("/logout")
async def logout(token: str):
    if token in active_sessions:
        del active_sessions[token]
    return {"message": "Logged out successfully"}

@router.get("/verify")
async def verify_token(token: str):
    if token in active_sessions:
        session = active_sessions[token]
        if session["expires"] > datetime.now():
            return {
                "valid": True,
                "user_id": session["user_id"],
                "user_type": session["user_type"],
                "full_name": session["full_name"]
            }
    return {"valid": False}

def get_current_user(token: str):
    """Dependency to get current user from token"""
    if token in active_sessions:
        session = active_sessions[token]
        if session["expires"] > datetime.now():
            return session
    return None