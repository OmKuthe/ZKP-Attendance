import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import Login from './components/Auth/Login'
import AdminDashboard from './components/Admin/AdminDashboard'
import StudentManagement from './components/Admin/StudentManagement'
import FacultyManagement from './components/Admin/FacultyManagement'
import SessionMonitor from './components/Admin/SessionMonitor'
import FacultyDashboard from './components/Faculty/FacultyDashboard'
import CreateSession from './components/Faculty/CreateSession'
import StudentDashboard from './components/Student/StudentDashboard'
import JoinSession from './components/Student/JoinSession'
import ViewAttendance from './components/Faculty/ViewAttendance'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute role="admin"><StudentManagement /></ProtectedRoute>} />
          <Route path="/admin/faculty" element={<ProtectedRoute role="admin"><FacultyManagement /></ProtectedRoute>} />
          <Route path="/admin/sessions" element={<ProtectedRoute role="admin"><SessionMonitor /></ProtectedRoute>} />
          
          {/* Faculty Routes */}
          <Route path="/faculty" element={<ProtectedRoute role="faculty"><FacultyDashboard /></ProtectedRoute>} />
          <Route path="/faculty/create-session" element={<ProtectedRoute role="faculty"><CreateSession /></ProtectedRoute>} />
          <Route path="/faculty/attendance" element={<ProtectedRoute role="faculty"><ViewAttendance /></ProtectedRoute>} />
          {/* Student Routes */}
          <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/join" element={<ProtectedRoute role="student"><JoinSession /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App