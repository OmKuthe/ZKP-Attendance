from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class SessionCreate(BaseModel):
    faculty_id: str
    lat: float
    lng: float
    radius: int
    duration_minutes: int = 60
    department: Optional[str] = None

class SessionResponse(BaseModel):
    session_nonce: str
    start_time: datetime
    end_time: datetime

class AttendanceSubmit(BaseModel):
    session_nonce: str
    student_id: str
    zk_proof: Dict[str, Any]
    public_signals: List[str]
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None

class AttendanceResponse(BaseModel):
    status: str
    verified: bool
    record_id: int
    message: str

class UserCreate(BaseModel):
    user_id: str
    email: str
    full_name: str
    user_type: str
    password: Optional[str] = None

class UserResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    user_type: str
    is_active: bool
    created_at: datetime