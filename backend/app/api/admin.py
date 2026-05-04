from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from ..database import get_db
from ..models import User, StudentProfile, FacultyProfile, Session as SessionModel, SessionAttendance
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional, List
import secrets
from passlib.context import CryptContext
from fastapi import Response
import csv
from io import StringIO

router = APIRouter(prefix="/api/admin", tags=["admin"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ========== Pydantic Schemas ==========
class CreateStudent(BaseModel):
    student_id: str
    email: EmailStr
    full_name: str
    roll_number: str
    department: str
    year: int
    semester: int
    phone_number: str

class CreateFaculty(BaseModel):
    faculty_id: str
    email: EmailStr
    full_name: str
    department: str
    designation: str
    phone_number: str
    password: str

class CreateAdmin(BaseModel):
    admin_id: str
    email: EmailStr
    full_name: str
    password: str

class StudentResponse(BaseModel):
    student_id: str
    email: str
    full_name: str
    roll_number: str
    department: str
    year: int
    semester: int
    phone_number: str
    is_active: bool

class FacultyResponse(BaseModel):
    faculty_id: str
    email: str
    full_name: str
    department: str
    designation: str
    phone_number: str
    is_active: bool

# ========== Admin Authentication ==========
# Simple token-based auth (replace with JWT in production)
ADMIN_TOKENS = {"admin_secret_key_2026": "admin"}

async def verify_admin_token(token: str):
    if token not in ADMIN_TOKENS:
        raise HTTPException(status_code=401, detail="Admin access required")
    return True

# ========== Initialize Default Admin ==========
async def init_default_admin(db: AsyncSession):
    """Create default admin if not exists"""
    result = await db.execute(
        select(User).where(User.user_type == "admin")
    )
    admin = result.scalar_one_or_none()
    
    if not admin:
        hashed_password = pwd_context.hash("admin123")
        default_admin = User(
            user_id="admin",
            email="admin@zkattend.com",
            full_name="System Administrator",
            user_type="admin",
            hashed_password=hashed_password,
            is_active=True
        )
        db.add(default_admin)
        await db.commit()
        print("Default admin created: admin/admin123")

# ========== Student Management ==========
@router.post("/students/create", response_model=dict)
async def create_student(
    student: CreateStudent,
    admin_token: str,
    db: AsyncSession = Depends(get_db)
):
    await verify_admin_token(admin_token)
    
    # Check if user exists
    existing = await db.execute(
        select(User).where(User.user_id == student.student_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Student ID already exists")
    
    # Check email
    email_exists = await db.execute(
        select(User).where(User.email == student.email)
    )
    if email_exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user account
    new_user = User(
        user_id=student.student_id,
        email=student.email,
        full_name=student.full_name,
        user_type="student",
        hashed_password="",  # Students login without password
        is_active=True
    )
    db.add(new_user)
    await db.flush()  # Get the user id
    
    # Create student profile
    new_student = StudentProfile(
        student_id=student.student_id,
        roll_number=student.roll_number,
        department=student.department,
        year=student.year,
        semester=student.semester,
        phone_number=student.phone_number,
        user_id=new_user.id
    )
    db.add(new_student)
    await db.commit()
    
    return {"message": f"Student {student.student_id} created successfully", "student_id": student.student_id}

@router.get("/students/list", response_model=dict)
async def list_students(
    admin_token: str,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    department: Optional[str] = None
):
    await verify_admin_token(admin_token)
    
    query = select(StudentProfile)
    if department:
        query = query.where(StudentProfile.department == department)
    
    result = await db.execute(query.offset(skip).limit(limit))
    students = result.scalars().all()
    
    # Get user details for each student
    student_list = []
    for student in students:
        user_result = await db.execute(
            select(User).where(User.id == student.user_id)
        )
        user = user_result.scalar_one_or_none()
        student_list.append({
            "student_id": student.student_id,
            "email": user.email if user else "",
            "full_name": user.full_name if user else "",
            "roll_number": student.roll_number,
            "department": student.department,
            "year": student.year,
            "semester": student.semester,
            "phone_number": student.phone_number,
            "is_active": user.is_active if user else True
        })
    
    return {"students": student_list, "total": len(student_list)}

@router.put("/students/{student_id}/toggle-status")
async def toggle_student_status(
    student_id: str,
    admin_token: str,
    db: AsyncSession = Depends(get_db)
):
    await verify_admin_token(admin_token)
    
    result = await db.execute(
        select(User).where(User.user_id == student_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    
    user.is_active = not user.is_active
    await db.commit()
    
    return {"message": f"Student {student_id} status updated to {user.is_active}"}

@router.delete("/students/{student_id}")
async def delete_student(
    student_id: str,
    admin_token: str,
    db: AsyncSession = Depends(get_db)
):
    await verify_admin_token(admin_token)
    
    # Delete user and profile
    user_result = await db.execute(
        select(User).where(User.user_id == student_id)
    )
    user = user_result.scalar_one_or_none()
    if user:
        # Delete profile first
        profile_result = await db.execute(
            select(StudentProfile).where(StudentProfile.student_id == student_id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile:
            await db.delete(profile)
        
        await db.delete(user)
        await db.commit()
    
    return {"message": f"Student {student_id} deleted"}

# ========== Faculty Management ==========
@router.post("/faculty/create", response_model=dict)
async def create_faculty(
    faculty: CreateFaculty,
    admin_token: str,
    db: AsyncSession = Depends(get_db)
):
    await verify_admin_token(admin_token)
    
    # Check if exists
    existing = await db.execute(
        select(User).where(User.user_id == faculty.faculty_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Faculty ID already exists")
    
    # Check email
    email_exists = await db.execute(
        select(User).where(User.email == faculty.email)
    )
    if email_exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user
    hashed_password = pwd_context.hash(faculty.password)
    new_user = User(
        user_id=faculty.faculty_id,
        email=faculty.email,
        full_name=faculty.full_name,
        user_type="faculty",
        hashed_password=hashed_password,
        is_active=True
    )
    db.add(new_user)
    await db.flush()
    
    # Create faculty profile
    new_faculty = FacultyProfile(
        faculty_id=faculty.faculty_id,
        department=faculty.department,
        designation=faculty.designation,
        phone_number=faculty.phone_number,
        user_id=new_user.id
    )
    db.add(new_faculty)
    await db.commit()
    
    return {"message": f"Faculty {faculty.faculty_id} created successfully", "faculty_id": faculty.faculty_id}

@router.get("/faculty/list", response_model=dict)
async def list_faculty(
    admin_token: str,
    db: AsyncSession = Depends(get_db),
    department: Optional[str] = None
):
    await verify_admin_token(admin_token)
    
    query = select(FacultyProfile)
    if department:
        query = query.where(FacultyProfile.department == department)
    
    result = await db.execute(query)
    faculty_list = result.scalars().all()
    
    faculty_data = []
    for faculty in faculty_list:
        user_result = await db.execute(
            select(User).where(User.id == faculty.user_id)
        )
        user = user_result.scalar_one_or_none()
        faculty_data.append({
            "faculty_id": faculty.faculty_id,
            "email": user.email if user else "",
            "full_name": user.full_name if user else "",
            "department": faculty.department,
            "designation": faculty.designation,
            "phone_number": faculty.phone_number,
            "is_active": user.is_active if user else True
        })
    
    return {"faculty": faculty_data}

@router.delete("/faculty/{faculty_id}")
async def delete_faculty(
    faculty_id: str,
    admin_token: str,
    db: AsyncSession = Depends(get_db)
):
    await verify_admin_token(admin_token)
    
    user_result = await db.execute(
        select(User).where(User.user_id == faculty_id)
    )
    user = user_result.scalar_one_or_none()
    if user:
        profile_result = await db.execute(
            select(FacultyProfile).where(FacultyProfile.faculty_id == faculty_id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile:
            await db.delete(profile)
        
        await db.delete(user)
        await db.commit()
    
    return {"message": f"Faculty {faculty_id} deleted"}

# ========== Dashboard & Statistics ==========
@router.get("/dashboard/stats")
async def get_admin_stats(
    admin_token: str,
    db: AsyncSession = Depends(get_db)
):
    await verify_admin_token(admin_token)
    
    # Get counts
    students_result = await db.execute(select(func.count(StudentProfile.id)))
    total_students = students_result.scalar()
    
    faculty_result = await db.execute(select(func.count(FacultyProfile.id)))
    total_faculty = faculty_result.scalar()
    
    sessions_result = await db.execute(select(func.count(SessionModel.id)))
    total_sessions = sessions_result.scalar()
    
    attendance_result = await db.execute(select(func.count(SessionAttendance.id)))
    total_attendances = attendance_result.scalar()
    
    # Get department wise stats
    dept_stats = await db.execute(
        select(StudentProfile.department, func.count(StudentProfile.id))
        .group_by(StudentProfile.department)
    )
    departments = [{"department": dept, "count": count} for dept, count in dept_stats.all()]
    
    # Recent sessions
    recent_sessions_result = await db.execute(
        select(SessionModel).order_by(SessionModel.start_time.desc()).limit(5)
    )
    recent_sessions = recent_sessions_result.scalars().all()
    
    return {
        "total_students": total_students or 0,
        "total_faculty": total_faculty or 0,
        "total_sessions": total_sessions or 0,
        "total_attendances": total_attendances or 0,
        "departments": departments,
        "recent_sessions": [
            {
                "session_nonce": s.session_nonce,
                "faculty_id": s.faculty_id,
                "start_time": s.start_time.isoformat(),
                "end_time": s.end_time.isoformat()
            } for s in recent_sessions
        ]
    }

@router.get("/sessions/all")
async def get_all_sessions(
    admin_token: str,
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    department: Optional[str] = None
):
    await verify_admin_token(admin_token)
    
    query = select(SessionModel).order_by(SessionModel.start_time.desc())
    if department:
        query = query.where(SessionModel.department == department)
    
    result = await db.execute(query.limit(limit))
    sessions = result.scalars().all()
    
    # Get attendance stats for each session
    session_stats = []
    for session in sessions:
        attendance_result = await db.execute(
            select(func.count(SessionAttendance.id)).where(
                SessionAttendance.session_nonce == session.session_nonce
            )
        )
        attendance_count = attendance_result.scalar() or 0
        
        session_stats.append({
            "session_nonce": session.session_nonce,
            "faculty_id": session.faculty_id,
            "start_time": session.start_time.isoformat(),
            "end_time": session.end_time.isoformat(),
            "class_center": {"lat": session.class_center_lat, "lng": session.class_center_lng},
            "radius_meters": session.radius_meters,
            "attendance_count": attendance_count,
            "department": session.department
        })
    
    return {"sessions": session_stats, "total": len(session_stats)}

@router.get("/session/{nonce}/attendance")
async def get_session_attendance(
    nonce: str,
    admin_token: str,
    db: AsyncSession = Depends(get_db)
):
    await verify_admin_token(admin_token)
    
    # Get session details
    session_result = await db.execute(
        select(SessionModel).where(SessionModel.session_nonce == nonce)
    )
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get attendance records
    result = await db.execute(
        select(SessionAttendance).where(SessionAttendance.session_nonce == nonce)
    )
    attendance_records = result.scalars().all()
    
    # Get student details for each record
    detailed_records = []
    for record in attendance_records:
        student_result = await db.execute(
            select(StudentProfile).where(StudentProfile.student_id == record.student_id)
        )
        student = student_result.scalar_one_or_none()
        
        user_result = await db.execute(
            select(User).where(User.user_id == record.student_id)
        )
        user = user_result.scalar_one_or_none()
        
        detailed_records.append({
            "student_id": record.student_id,
            "student_name": user.full_name if user else "Unknown",
            "roll_number": student.roll_number if student else "N/A",
            "timestamp": record.timestamp.isoformat(),
            "location": {"lat": record.location_lat, "lng": record.location_lng} if record.location_lat else None,
            "verified": record.is_verified
        })
    
    return {
        "session": {
            "nonce": session.session_nonce,
            "faculty_id": session.faculty_id,
            "start_time": session.start_time.isoformat(),
            "end_time": session.end_time.isoformat()
        },
        "attendance": detailed_records,
        "total": len(detailed_records)
    }

@router.get("/export/session/{nonce}/csv")
async def export_attendance_csv(
    nonce: str,
    admin_token: str,
    db: AsyncSession = Depends(get_db)
):
    await verify_admin_token(admin_token)
    
    # Get attendance data
    result = await db.execute(
        select(SessionAttendance).where(SessionAttendance.session_nonce == nonce)
    )
    records = result.scalars().all()
    
    # Create CSV content
    import csv
    from io import StringIO
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Student Name", "Timestamp", "Location Lat", "Location Lng", "Verified"])
    
    for record in records:
        user_result = await db.execute(
            select(User).where(User.user_id == record.student_id)
        )
        user = user_result.scalar_one_or_none()
        
        writer.writerow([
            record.student_id,
            user.full_name if user else "Unknown",
            record.timestamp.isoformat(),
            record.location_lat or "",
            record.location_lng or "",
            record.is_verified
        ])
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{nonce}.csv"}
    )