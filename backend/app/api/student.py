from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from ..database import get_db
from ..models import (
    Internship, InternshipEnrollment, DailyAttendance, AttendanceProof, 
    Company, StudentProfile
)
from ..schemas import AttendanceSubmit, AttendanceResponse
from ..utils.helpers import calculate_distance, hash_student_id
from .auth import get_current_user
from datetime import datetime, date, time, timedelta
from typing import Optional
import json
import pytz

router = APIRouter(prefix="/api/student", tags=["student"])

# Define IST timezone
IST = pytz.timezone('Asia/Kolkata')

async def verify_student(token: str, db: AsyncSession, student_id: str = None):
    current_user = get_current_user(token)
    if not current_user or current_user["user_type"] != "student":
        raise HTTPException(status_code=401, detail="Unauthorized")
    if student_id and current_user["user_id"] != student_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user

@router.get("/dashboard")
async def get_student_dashboard(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = await verify_student(token, db)
    
    # Get student profile
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.student_id == current_user["user_id"])
    )
    profile = profile_result.scalar_one_or_none()
    
    # Get current time in IST
    now_utc = datetime.now(pytz.UTC)
    now_ist = now_utc.astimezone(IST)
    current_time = now_ist.time()
    
    # Get active internship
    active_internship = None
    today = date.today()
    
    if profile and profile.current_internship_id:
        internship_result = await db.execute(
            select(Internship).where(Internship.id == profile.current_internship_id)
        )
        internship = internship_result.scalar_one_or_none()
        
        if internship and internship.start_date <= today <= internship.end_date:
            company_result = await db.execute(select(Company).where(Company.id == internship.company_id))
            company = company_result.scalar_one_or_none()
            
            # Get today's attendance
            attendance_result = await db.execute(
                select(DailyAttendance).where(
                    and_(
                        DailyAttendance.internship_id == internship.id,
                        DailyAttendance.student_id == current_user["user_id"],
                        DailyAttendance.date == today
                    )
                )
            )
            today_attendance = attendance_result.scalar_one_or_none()
            
            # Check if current time is within internship hours
            can_start = False
            status_message = ""
            
            if current_time < internship.daily_start_time:
                can_start = False
                status_message = f"Session starts at {internship.daily_start_time.strftime('%I:%M %p')}"
            elif current_time > internship.daily_end_time:
                can_start = False
                status_message = f"Session ended at {internship.daily_end_time.strftime('%I:%M %p')}"
            else:
                can_start = True
                status_message = "Session active"
            
            # Calculate total minutes
            start_minutes = internship.daily_start_time.hour * 60 + internship.daily_start_time.minute
            end_minutes = internship.daily_end_time.hour * 60 + internship.daily_end_time.minute
            total_minutes = end_minutes - start_minutes
            
            # Calculate elapsed minutes if tracking has started
            elapsed_minutes = 0
            if today_attendance and today_attendance.first_proof_time:
                # Convert to IST for comparison
                first_proof_utc = today_attendance.first_proof_time.replace(tzinfo=pytz.UTC)
                elapsed_seconds = (now_utc - first_proof_utc).total_seconds()
                elapsed_minutes = min(int(elapsed_seconds / 60), total_minutes)
            
            active_internship = {
                "internship_id": internship.internship_id,
                "company_name": company.name if company else "Unknown",
                "role_name": internship.role_name,
                "daily_start": internship.daily_start_time.strftime("%H:%M"),
                "daily_end": internship.daily_end_time.strftime("%H:%M"),
                "total_minutes": total_minutes,
                "elapsed_minutes": elapsed_minutes,
                "can_start": can_start,
                "status_message": status_message,
                "company_location": {"lat": company.latitude, "lng": company.longitude} if company else None,
                "radius": company.radius_meters if company else 200,
                "is_test_mode": bool(internship.is_test_mode),
                "proof_interval_minutes": internship.proof_interval_minutes,
                "company_address": company.address if company else "Address not available",
            }
    
    return {
        "student": {
            "student_id": current_user["user_id"],
            "full_name": current_user["full_name"]
        },
        "active_internship": active_internship,
        "server_time": now_ist.strftime("%Y-%m-%d %H:%M:%S")
    }


@router.get("/attendance/calendar")
async def get_attendance_calendar(
    year: int,
    month: int,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = await verify_student(token, db)
    
    # Get all attendance for the specified month
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    # Get active internship for this student
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.student_id == current_user["user_id"])
    )
    profile = profile_result.scalar_one_or_none()
    
    if not profile or not profile.current_internship_id:
        return {"attendance": {}}
    
    query = select(DailyAttendance).where(
        and_(
            DailyAttendance.student_id == current_user["user_id"],
            DailyAttendance.date >= start_date,
            DailyAttendance.date < end_date
        )
    )
    
    result = await db.execute(query)
    attendances = result.scalars().all()
    
    # Create calendar data
    calendar_data = {}
    for att in attendances:
        calendar_data[att.date.isoformat()] = {
            "hours": att.total_hours,
            "status": att.status,
            "proof_count": att.proof_count
        }
    
    return {
        "year": year,
        "month": month,
        "attendance": calendar_data
    }


@router.get("/attendance/status")
async def get_attendance_status(
    date_param: str,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = await verify_student(token, db)
    
    target_date = datetime.strptime(date_param, "%Y-%m-%d").date()
    
    # Get student profile
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.student_id == current_user["user_id"])
    )
    profile = profile_result.scalar_one_or_none()
    
    if not profile or not profile.current_internship_id:
        return {"status": "no_internship", "total_hours": 0}
    
    # Get daily attendance
    attendance_result = await db.execute(
        select(DailyAttendance).where(
            and_(
                DailyAttendance.student_id == current_user["user_id"],
                DailyAttendance.date == target_date
            )
        )
    )
    attendance = attendance_result.scalar_one_or_none()
    
    if not attendance:
        return {"status": "absent", "total_hours": 0}
    
    return {
        "status": attendance.status,
        "total_hours": attendance.total_hours,
        "proof_count": attendance.proof_count
    }

@router.post("/attendance/submit", response_model=AttendanceResponse)
async def submit_attendance_proof(
    proof: AttendanceSubmit,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = await verify_student(token, db, proof.student_id)
    
    try:
        # Get internship by ID
        internship_result = await db.execute(
            select(Internship).where(Internship.internship_id == proof.internship_id)
        )
        internship = internship_result.scalar_one_or_none()
        
        if not internship:
            raise HTTPException(status_code=404, detail="Internship not found")
        
        # Check if student is enrolled
        enrollment_result = await db.execute(
            select(InternshipEnrollment).where(
                and_(
                    InternshipEnrollment.internship_id == internship.id,
                    InternshipEnrollment.student_id == proof.student_id,
                    InternshipEnrollment.status == "active"
                )
            )
        )
        enrollment = enrollment_result.scalar_one_or_none()
        
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this internship")
        
        # Get company location
        company_result = await db.execute(select(Company).where(Company.id == internship.company_id))
        company = company_result.scalar_one_or_none()
        
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Calculate distance
        distance = calculate_distance(
            proof.latitude, proof.longitude,
            company.latitude, company.longitude
        )
        
        # Check if within radius
        is_valid = distance <= company.radius_meters
        
        # Get or create daily attendance record
        today = date.today()
        attendance_result = await db.execute(
            select(DailyAttendance).where(
                and_(
                    DailyAttendance.internship_id == internship.id,
                    DailyAttendance.student_id == proof.student_id,
                    DailyAttendance.date == today
                )
            )
        )
        daily_attendance = attendance_result.scalar_one_or_none()
        
        if not daily_attendance:
            daily_attendance = DailyAttendance(
                internship_id=internship.id,
                student_id=proof.student_id,
                date=today,
                status="in_progress"
            )
            db.add(daily_attendance)
            await db.flush()
        
        # Update first/last proof times
        proof_time = datetime.now(pytz.UTC).replace(tzinfo=None)
        if proof.proof_type == "entry" or not daily_attendance.first_proof_time:
            daily_attendance.first_proof_time = proof_time
        daily_attendance.last_proof_time = proof_time
        daily_attendance.proof_count += 1
        
        # Save proof
        new_proof = AttendanceProof(
            attendance_id=daily_attendance.id,
            student_id=proof.student_id,
            internship_id=internship.id,
            timestamp=proof_time,
            latitude=proof.latitude,
            longitude=proof.longitude,
            distance_from_company=distance,
            zk_proof=json.dumps(proof.zk_proof) if proof.zk_proof else "{}",
            public_signals=json.dumps(proof.public_signals) if proof.public_signals else "[]",
            proof_type=proof.proof_type,
            is_valid=is_valid,
            verified_at=proof_time if is_valid else None
        )
        db.add(new_proof)
        
        # Update total hours if this is an exit proof
        if proof.proof_type == "exit" and daily_attendance.first_proof_time:
            total_minutes = (proof_time - daily_attendance.first_proof_time).total_seconds() / 60
            if total_minutes > internship.lunch_break_minutes:
                total_minutes -= internship.lunch_break_minutes
            total_hours = round(total_minutes / 60, 2)
            
            daily_attendance.total_minutes = int(total_minutes)
            daily_attendance.total_hours = total_hours
            
            if total_hours >= internship.required_hours_per_day:
                daily_attendance.status = "full_day"
            elif total_hours >= internship.min_hours_for_present:
                daily_attendance.status = "partial"
            else:
                daily_attendance.status = "absent"
            
            if daily_attendance.status in ["full_day", "partial"]:
                student_result = await db.execute(
                    select(StudentProfile).where(StudentProfile.student_id == proof.student_id)
                )
                student = student_result.scalar_one_or_none()
                if student:
                    student.total_hours_completed += total_hours
                    if daily_attendance.status == "full_day":
                        student.total_days_present += 1
        
        await db.commit()
        
        return AttendanceResponse(
            status="success",
            verified=is_valid,
            message=f"{proof.proof_type.capitalize()} proof recorded",
            proof_id=new_proof.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in submit_attendance_proof: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/attendance/today")
async def get_today_attendance(
    internship_id: Optional[str] = None,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = await verify_student(token, db)
    
    # Get today's date in IST
    now_ist = datetime.now(IST)
    today_ist = now_ist.date()
    today_start_ist = datetime.combine(today_ist, time.min).replace(tzinfo=IST)
    today_end_ist = datetime.combine(today_ist, time.max).replace(tzinfo=IST)
    
    # Convert to UTC for database query
    today_start_utc = today_start_ist.astimezone(pytz.UTC).replace(tzinfo=None)
    today_end_utc = today_end_ist.astimezone(pytz.UTC).replace(tzinfo=None)
    
    print(f"DEBUG: IST today: {today_ist}")
    print(f"DEBUG: UTC range: {today_start_utc} to {today_end_utc}")
    
    # Get proofs for today using UTC range
    query = select(AttendanceProof).where(
        and_(
            AttendanceProof.student_id == current_user["user_id"],
            AttendanceProof.timestamp >= today_start_utc,
            AttendanceProof.timestamp <= today_end_utc
        )
    )
    
    if internship_id:
        internship_result = await db.execute(
            select(Internship).where(Internship.internship_id == internship_id)
        )
        internship = internship_result.scalar_one_or_none()
        if internship:
            query = query.where(AttendanceProof.internship_id == internship.id)
    
    query = query.order_by(AttendanceProof.timestamp)
    result = await db.execute(query)
    proofs = result.scalars().all()
    
    print(f"DEBUG: Found {len(proofs)} proofs for today")
    
    # Convert UTC to IST for display
    proofs_data = []
    for p in proofs:
        utc_time = p.timestamp.replace(tzinfo=pytz.UTC)
        ist_time = utc_time.astimezone(IST)
        
        proofs_data.append({
            "time": ist_time.strftime("%H:%M:%S"),
            "type": p.proof_type,
            "verified": p.is_valid,
            "distance": round(p.distance_from_company, 2) if p.distance_from_company else None
        })
    
    return {
        "date": today_ist.isoformat(),
        "proofs": proofs_data,
        "count": len(proofs_data)
    }


@router.get("/attendance/history")
async def get_attendance_history(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
    limit: int = 30,
    offset: int = 0
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    token = authorization.replace("Bearer ", "")
    current_user = await verify_student(token, db)
    
    result = await db.execute(
        select(DailyAttendance)
        .where(DailyAttendance.student_id == current_user["user_id"])
        .order_by(DailyAttendance.date.desc())
        .offset(offset)
        .limit(limit)
    )
    attendance_records = result.scalars().all()
    
    history = []
    for record in attendance_records:
        internship_result = await db.execute(
            select(Internship).where(Internship.id == record.internship_id)
        )
        internship = internship_result.scalar_one_or_none()
        
        company_result = await db.execute(
            select(Company).where(Company.id == internship.company_id)
        ) if internship else None
        company = company_result.scalar_one_or_none() if company_result else None
        
        history.append({
            "date": record.date.isoformat(),
            "company": company.name if company else "Unknown",
            "role": internship.role_name if internship else "Unknown",
            "hours": float(record.total_hours),
            "status": record.status,
            "proof_count": record.proof_count
        })
    
    return {"history": history, "total": len(history)}