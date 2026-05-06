from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from ..database import get_db
from ..models import Internship, InternshipEnrollment, DailyAttendance, AttendanceProof, User, StudentProfile, Company
from ..utils.helpers import calculate_attendance_hours
from .auth import get_current_user
from datetime import datetime, date, timedelta
from typing import Optional
import json

router = APIRouter(prefix="/api/manager", tags=["manager"])

# ========== Helper ==========
async def verify_manager(token: str, db: AsyncSession, manager_id: str = None):
    current_user = get_current_user(token)
    if not current_user or current_user["user_type"] != "manager":
        raise HTTPException(status_code=401, detail="Unauthorized")
    if manager_id and current_user["user_id"] != manager_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user

# ========== Dashboard ==========
@router.get("/dashboard")
async def get_manager_dashboard(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = await verify_manager(token, db)
    
    # Get all internships managed by this manager
    internships_result = await db.execute(
        select(Internship).where(Internship.manager_id == current_user["user_id"])
    )
    internships = internships_result.scalars().all()
    
    dashboard_data = []
    for internship in internships:
        # Get enrolled students
        enrollments_result = await db.execute(
            select(InternshipEnrollment).where(InternshipEnrollment.internship_id == internship.id)
        )
        enrollments = enrollments_result.scalars().all()
        total_students = len(enrollments)
        
        # Get today's attendance
        today = date.today()
        present_today = await db.execute(
            select(func.count(DailyAttendance.id)).where(
                and_(
                    DailyAttendance.internship_id == internship.id,
                    DailyAttendance.date == today,
                    or_(
                        DailyAttendance.status == "full_day",
                        DailyAttendance.status == "partial"
                    )
                )
            )
        )
        present_count = present_today.scalar() or 0
        
        # Get company details
        company_result = await db.execute(select(Company).where(Company.id == internship.company_id))
        company = company_result.scalar_one_or_none()
        
        dashboard_data.append({
            "internship_id": internship.internship_id,
            "company_name": company.name if company else "Unknown",
            "role_name": internship.role_name,
            "total_students": total_students,
            "present_today": present_count,
            "absent_today": total_students - present_count,
            "status": internship.status,
            "daily_hours": f"{internship.daily_start_time} - {internship.daily_end_time}"
        })
    
    return {"internships": dashboard_data}

# ========== Internship Details ==========
@router.get("/internship/{internship_id}")
async def get_internship_details(
    internship_id: str,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = await verify_manager(token, db)
    
    # Get internship
    internship_result = await db.execute(
        select(Internship).where(Internship.internship_id == internship_id)
    )
    internship = internship_result.scalar_one_or_none()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
    
    # Verify manager owns this internship
    if internship.manager_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get company details
    company_result = await db.execute(select(Company).where(Company.id == internship.company_id))
    company = company_result.scalar_one_or_none()
    
    # Get enrolled students with today's attendance
    enrollments_result = await db.execute(
        select(InternshipEnrollment).where(InternshipEnrollment.internship_id == internship.id)
    )
    enrollments = enrollments_result.scalars().all()
    
    students_data = []
    today = date.today()
    
    for enrollment in enrollments:
        # Get student details
        student_result = await db.execute(
            select(StudentProfile).where(StudentProfile.student_id == enrollment.student_id)
        )
        student = student_result.scalar_one_or_none()
        
        user_result = await db.execute(select(User).where(User.user_id == enrollment.student_id))
        user = user_result.scalar_one_or_none()
        
        # Get today's attendance
        attendance_result = await db.execute(
            select(DailyAttendance).where(
                and_(
                    DailyAttendance.internship_id == internship.id,
                    DailyAttendance.student_id == enrollment.student_id,
                    DailyAttendance.date == today
                )
            )
        )
        attendance = attendance_result.scalar_one_or_none()
        
        # Get latest proof
        latest_proof_result = await db.execute(
            select(AttendanceProof)
            .where(AttendanceProof.internship_id == internship.id)
            .where(AttendanceProof.student_id == enrollment.student_id)
            .order_by(AttendanceProof.timestamp.desc())
            .limit(1)
        )
        latest_proof = latest_proof_result.scalar_one_or_none()
        
        students_data.append({
            "student_id": enrollment.student_id,
            "student_name": user.full_name if user else "Unknown",
            "roll_number": student.roll_number if student else "N/A",
            "today_status": attendance.status if attendance else "absent",
            "today_hours": attendance.total_hours if attendance else 0,
            "last_proof_time": latest_proof.timestamp.isoformat() if latest_proof else None,
            "last_location": {"lat": latest_proof.latitude, "lng": latest_proof.longitude} if latest_proof else None
        })
    
    return {
        "internship": {
            "internship_id": internship.internship_id,
            "company_name": company.name if company else "Unknown",
            "company_location": {"lat": company.latitude, "lng": company.longitude} if company else None,
            "radius": company.radius_meters if company else 200,
            "role_name": internship.role_name,
            "description": internship.description,
            "daily_start_time": str(internship.daily_start_time),
            "daily_end_time": str(internship.daily_end_time),
            "required_hours": internship.required_hours_per_day,
            "status": internship.status
        },
        "students": students_data,
        "total_students": len(students_data),
        "present_count": len([s for s in students_data if s["today_status"] in ["full_day", "partial"]]),
        "absent_count": len([s for s in students_data if s["today_status"] == "absent"])
    }

# ========== Student Timeline ==========
@router.get("/student/{student_id}/timeline")
async def get_student_timeline(
    student_id: str,
    internship_id: str,
    date_param: Optional[str] = None,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = await verify_manager(token, db)
    
    # Get internship
    internship_result = await db.execute(
        select(Internship).where(Internship.internship_id == internship_id)
    )
    internship = internship_result.scalar_one_or_none()
    if not internship or internship.manager_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    target_date = datetime.strptime(date_param, "%Y-%m-%d").date() if date_param else date.today()
    
    # Get proofs for that day
    proofs_result = await db.execute(
        select(AttendanceProof)
        .where(AttendanceProof.internship_id == internship.id)
        .where(AttendanceProof.student_id == student_id)
        .where(func.date(AttendanceProof.timestamp) == target_date)
        .order_by(AttendanceProof.timestamp)
    )
    proofs = proofs_result.scalars().all()
    
    # Get daily summary
    attendance_result = await db.execute(
        select(DailyAttendance)
        .where(DailyAttendance.internship_id == internship.id)
        .where(DailyAttendance.student_id == student_id)
        .where(DailyAttendance.date == target_date)
    )
    attendance = attendance_result.scalar_one_or_none()
    
    return {
        "date": target_date.isoformat(),
        "total_hours": attendance.total_hours if attendance else 0,
        "status": attendance.status if attendance else "absent",
        "proofs": [
            {
                "time": p.timestamp.strftime("%H:%M:%S"),
                "type": p.proof_type,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "distance": p.distance_from_company
            } for p in proofs
        ]
    }

# ========== Export Report ==========
@router.get("/internship/{internship_id}/export")
async def export_attendance_report(
    internship_id: str,
    start_date: str,
    end_date: str,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = await verify_manager(token, db)
    
    # Get internship
    internship_result = await db.execute(
        select(Internship).where(Internship.internship_id == internship_id)
    )
    internship = internship_result.scalar_one_or_none()
    if not internship or internship.manager_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    
    # Get all attendance records in date range
    attendance_result = await db.execute(
        select(DailyAttendance)
        .where(DailyAttendance.internship_id == internship.id)
        .where(DailyAttendance.date >= start)
        .where(DailyAttendance.date <= end)
        .order_by(DailyAttendance.date, DailyAttendance.student_id)
    )
    attendance_records = attendance_result.scalars().all()
    
    # Group by student
    report_data = {}
    for record in attendance_records:
        if record.student_id not in report_data:
            report_data[record.student_id] = []
        report_data[record.student_id].append({
            "date": record.date.isoformat(),
            "hours": record.total_hours,
            "status": record.status
        })
    
    # Get student names
    students_info = {}
    for student_id in report_data.keys():
        user_result = await db.execute(select(User).where(User.user_id == student_id))
        user = user_result.scalar_one_or_none()
        students_info[student_id] = user.full_name if user else student_id
    
    return {
        "internship_id": internship_id,
        "period": {"start": start_date, "end": end_date},
        "students": [
            {
                "student_id": student_id,
                "name": students_info[student_id],
                "attendance": records
            } for student_id, records in report_data.items()
        ]
    }