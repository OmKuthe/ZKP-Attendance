import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  ArrowLeftIcon, 
  UsersIcon, 
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon as DownloadIcon,
  ArrowPathIcon as RefreshIcon
} from '@heroicons/react/24/outline'
import api from '../../services/api'

const ViewAttendance = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = location.state || {}
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (!session) {
      navigate('/faculty')
      return
    }
    fetchAttendance()
    
    // Auto-refresh every 10 seconds if enabled
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchAttendance()
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [autoRefresh])

  const fetchAttendance = async () => {
    try {
      const response = await api.get(`/api/admin/session/${session.session_nonce}/attendance`, {
        params: { admin_token: 'admin_secret_key_2026' }
      })
      setAttendance(response.data.attendance)
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = () => {
    const headers = ['Student ID', 'Student Name', 'Roll Number', 'Timestamp', 'Location Lat', 'Location Lng', 'Status']
    const csvData = attendance.map(record => [
      record.student_id,
      record.student_name,
      record.roll_number || 'N/A',
      new Date(record.timestamp).toLocaleString(),
      record.location?.lat || 'N/A',
      record.location?.lng || 'N/A',
      record.verified ? 'Verified' : 'Pending'
    ])
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${session.session_nonce.slice(0, 8)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <button
          onClick={() => navigate('/faculty')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back to Dashboard
        </button>

        {/* Session Info Card */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{session.subject || 'Session'}</h2>
              <p className="text-gray-600 mt-1">Session Code: {session.session_nonce}</p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500">Faculty</p>
                  <p className="font-medium">{session.faculty_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">
                    {new Date(session.start_time).toLocaleTimeString()} - {new Date(session.end_time).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-sm">
                    {session.class_center?.lat?.toFixed(6)}, {session.class_center?.lng?.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Radius</p>
                  <p className="font-medium">{session.radius_meters} meters</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm ${
                  autoRefresh ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                <RefreshIcon className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={downloadCSV}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <DownloadIcon className="h-4 w-4 mr-1" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm text-gray-500">Total Attendance</p>
                <p className="text-2xl font-bold">{attendance.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm text-gray-500">Verified</p>
                <p className="text-2xl font-bold">{attendance.filter(a => a.verified).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm text-gray-500">Last Update</p>
                <p className="text-xs font-mono">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Student Attendance List</h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : attendance.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No students have marked attendance yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.map((record, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {record.student_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.student_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.roll_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.location ? (
                          <span className="text-xs">
                            {record.location.lat?.toFixed(4)}, {record.location.lng?.toFixed(4)}
                          </span>
                        ) : 'N/A'}
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

export default ViewAttendance