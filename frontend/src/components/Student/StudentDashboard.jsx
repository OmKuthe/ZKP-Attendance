import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  CheckCircleIcon,
  AcademicCapIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline'
import api from '../../services/api'

const StudentDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeSessions, setActiveSessions] = useState([])
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [sessionsRes, historyRes] = await Promise.all([
        api.get('/api/session/active/current'),
        api.get(`/api/attendance/student/${user.userId}/history`)
      ])
      setActiveSessions(sessionsRes.data)
      setAttendanceHistory(historyRes.data.history || [])
    } catch (error) {
      console.error('Error fetching data:', error)
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
              <span className="ml-2 text-sm text-gray-500">Student Portal</span>
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
            onClick={() => navigate('/student/join')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Join New Session
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </button>
        </div>

        {/* Active Sessions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Sessions</h2>
          {activeSessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No active sessions available
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeSessions.map((session) => (
                <div key={session.session_nonce} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Session: {session.session_nonce.slice(0, 8)}...
                    </h3>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span>Started: {new Date(session.start_time).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      <span>Ends: {new Date(session.end_time).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      <span>Radius: {session.radius_meters}m</span>
                    </div>
                    {session.subject && (
                      <div className="flex items-center">
                        <AcademicCapIcon className="h-4 w-4 mr-2" />
                        <span>Subject: {session.subject}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => navigate('/student/join', { state: { session } })}
                    className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                  >
                    Join Session
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance History */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Attendance History</h2>
          {attendanceHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No attendance records found
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceHistory.map((record, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.session_nonce.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard