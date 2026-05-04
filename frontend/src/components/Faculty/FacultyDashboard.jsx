import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { 
  CalendarIcon, 
  ClockIcon, 
  UsersIcon,
  PlusCircleIcon,
  AcademicCapIcon,
  EyeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import api from '../../services/api'

const FacultyDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalAttendance: 0,
    activeSessions: 0
  })

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await api.get(`/api/session/faculty/${user.userId}/sessions`)
      setSessions(response.data)
      
      const now = new Date()
      const activeCount = response.data.filter(s => 
        new Date(s.start_time) <= now && new Date(s.end_time) >= now
      ).length
      
      setStats({
        totalSessions: response.data.length,
        activeSessions: activeCount,
        totalAttendance: 0 // Will be updated when we fetch attendance counts
      })
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <AcademicCapIcon className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">ZKAttend</span>
              <span className="ml-2 text-sm text-gray-500">Faculty Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user.fullName}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/faculty/create-session')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Create New Session
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-full">
                <CalendarIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <ClockIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <UsersIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Attendance</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAttendance}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Sessions</h2>
          {sessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No sessions created yet. Click "Create New Session" to start.
            </div>
          ) : (
            <div className="grid gap-4">
              {sessions.map((session) => {
                const now = new Date()
                const startTime = new Date(session.start_time)
                const endTime = new Date(session.end_time)
                const isActive = now >= startTime && now <= endTime
                const isUpcoming = now < startTime
                
                return (
                  <div key={session.session_nonce} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Session: {session.session_nonce.slice(0, 16)}...
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {session.department && `Department: ${session.department}`}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isActive ? 'bg-green-100 text-green-800' : 
                        isUpcoming ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Completed'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Start:</strong> {startTime.toLocaleString()}</p>
                        <p><strong>End:</strong> {endTime.toLocaleString()}</p>
                      </div>
                      <div>
                        <p><strong>Location:</strong> {session.class_center.lat.toFixed(6)}, {session.class_center.lng.toFixed(6)}</p>
                        <p><strong>Radius:</strong> {session.radius_meters} meters</p>
                      </div>
                    </div>
                    
                    <button
                    onClick={() => navigate('/faculty/attendance', { state: { session } })}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View Attendance
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FacultyDashboard