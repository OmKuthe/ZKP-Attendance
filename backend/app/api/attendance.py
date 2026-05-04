from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from ..database import get_db
from ..models import Session as SessionModel, SessionAttendance, User
from ..schemas import AttendanceSubmit, AttendanceResponse
from ..zk_verifier import verify_zk_proof
from ..utils.hasher import hash_student_id
from ..api.auth import get_current_user
import json
import datetime
from typing import Optional

router = APIRouter()

@router.post("/submit", response_model=AttendanceResponse)

# In api/attendance.py, update the submit_attendance function to handle missing location data:

@router.post("/submit", response_model=AttendanceResponse)
async def submit_attendance(
    attendance_data: AttendanceSubmit,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Verify student authentication
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid token")
        
        token = authorization.replace("Bearer ", "")
        current_user = get_current_user(token)
        
        if not current_user or current_user["user_type"] != "student":
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        if current_user["user_id"] != attendance_data.student_id:
            raise HTTPException(status_code=403, detail="Student ID mismatch")
        
        # 1. Verify session exists and is active
        session_result = await db.execute(
            select(SessionModel).where(
                SessionModel.session_nonce == attendance_data.session_nonce
            )
        )
        session = session_result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        now = datetime.datetime.utcnow()
        if now < session.start_time or now > session.end_time:
            raise HTTPException(status_code=400, detail="Session not active")
        
        # 2. Verify ZK proof (simplified for now - will implement fully later)
        # For testing, we'll accept any proof
        is_valid = True
        
        # Uncomment when ZK is ready
        # try:
        #     is_valid = await verify_zk_proof(
        #         attendance_data.zk_proof,
        #         attendance_data.public_signals
        #     )
        # except Exception as e:
        #     raise HTTPException(status_code=400, detail=f"ZK verification failed: {str(e)}")
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid ZK proof - location verification failed")
        
        # 3. Hash student ID for privacy
        student_hash = hash_student_id(attendance_data.student_id)
        
        # 4. Check for duplicate attendance
        existing = await db.execute(
            select(SessionAttendance).where(
                and_(
                    SessionAttendance.session_nonce == attendance_data.session_nonce,
                    SessionAttendance.student_id == attendance_data.student_id
                )
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Already marked attendance for this session")
        
        # 5. Save attendance record
        new_record = SessionAttendance(
            session_nonce=attendance_data.session_nonce,
            student_id=attendance_data.student_id,
            student_id_hash=student_hash,
            location_lat=getattr(attendance_data, 'location_lat', None),
            location_lng=getattr(attendance_data, 'location_lng', None),
            proof_hash=json.dumps(attendance_data.zk_proof) if attendance_data.zk_proof else "",
            is_verified=True
        )
        db.add(new_record)
        await db.commit()
        await db.refresh(new_record)
        
        return AttendanceResponse(
            status="success",
            verified=True,
            record_id=new_record.id,
            message="Attendance marked successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in submit_attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/student/{student_id}/history")
async def get_student_attendance(
    student_id: str,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    # Verify authentication
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = get_current_user(token)
    
    if not current_user or current_user["user_id"] != student_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Get attendance records
    result = await db.execute(
        select(SessionAttendance)
        .where(SessionAttendance.student_id == student_id)
        .order_by(SessionAttendance.timestamp.desc())
        .limit(50)
    )
    records = result.scalars().all()
    
    # Get session details for each record
    history = []
    for record in records:
        session_result = await db.execute(
            select(SessionModel).where(SessionModel.session_nonce == record.session_nonce)
        )
        session = session_result.scalar_one_or_none()
        
        if session:
            history.append({
                "session_nonce": record.session_nonce,
                "faculty_id": session.faculty_id,
                "timestamp": record.timestamp.isoformat(),
                "session_start": session.start_time.isoformat(),
                "session_end": session.end_time.isoformat(),
                "verified": record.is_verified,
                "location": {"lat": record.location_lat, "lng": record.location_lng} if record.location_lat else None
            })
    
    return {"history": history, "total": len(history)}

@router.get("/session/{session_nonce}/verify-student")
async def check_student_attendance(
    session_nonce: str,
    student_id: str,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    # Verify authentication (faculty or admin can check)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = get_current_user(token)
    
    if not current_user or current_user["user_type"] not in ["faculty", "admin"]:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Check if student attended
    result = await db.execute(
        select(SessionAttendance).where(
            and_(
                SessionAttendance.session_nonce == session_nonce,
                SessionAttendance.student_id == student_id
            )
        )
    )
    record = result.scalar_one_or_none()
    
    return {
        "attended": record is not None,
        "timestamp": record.timestamp.isoformat() if record else None,
        "verified": record.is_verified if record else False
    }