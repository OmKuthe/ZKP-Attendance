from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)  # faculty_id or student_id
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    user_type = Column(String)  # 'admin', 'faculty', 'student'
    hashed_password = Column(String, nullable=True)  # Null for students initially
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    faculty_profile = relationship("FacultyProfile", back_populates="user", uselist=False)

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True)
    roll_number = Column(String)
    department = Column(String)
    year = Column(Integer)
    semester = Column(Integer)
    phone_number = Column(String)
    
    # Foreign key to User
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="student_profile")

class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(String, unique=True, index=True)
    department = Column(String)
    designation = Column(String)
    phone_number = Column(String)
    
    # Foreign key to User
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="faculty_profile")

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_nonce = Column(String, unique=True, index=True)
    faculty_id = Column(String, index=True)
    class_center_lat = Column(Float)
    class_center_lng = Column(Float)
    radius_meters = Column(Integer)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    department = Column(String, nullable=True)
    subject = Column(String, nullable=True)  # Add department filtering

class SessionAttendance(Base):
    __tablename__ = "session_attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    session_nonce = Column(String, index=True)
    student_id = Column(String, index=True)  # Store actual ID (admin can see)
    student_id_hash = Column(String, index=True)  # For ZK privacy
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    proof_hash = Column(String, nullable=True)
    is_verified = Column(Boolean, default=True)

class AttendanceProof(Base):
    __tablename__ = "attendance_proofs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    student_id_hash = Column(String, index=True)
    zk_proof = Column(String)
    signature = Column(String)
    verified_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_verified = Column(Boolean, default=False)