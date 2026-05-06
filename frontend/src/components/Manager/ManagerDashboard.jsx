import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { 
  AcademicCapIcon, 
  BuildingOfficeIcon, 
  UsersIcon,
  CalendarIcon,
  CheckCircleIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ManagerDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [internships, setInternships] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInternships()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchInternships, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchInternships = async () => {
    try {
      const response = await api.get('/api/manager/dashboard')
      setInternships(response.data.internships)
    } catch (error) {
      console.error('Error fetching internships:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <AcademicCapIcon className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">ZKAttend</span>
              <span className="ml-2 text-sm text-gray-500">Manager Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchInternships}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Refresh"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-full">
                <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Internships</p>
                <p className="text-2xl font-bold text-gray-900">{internships.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <UsersIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {internships.reduce((sum, i) => sum + i.total_students, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <CheckCircleIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Present Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {internships.reduce((sum, i) => sum + (i.present_today || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <CalendarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Active Internships</p>
                <p className="text-2xl font-bold text-gray-900">
                  {internships.filter(i => i.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Internships List */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Internships</h2>
        
        {internships.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No internships assigned yet
          </div>
        ) : (
          <div className="grid gap-6">
            {internships.map((internship) => (
              <div key={internship.internship_id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{internship.company_name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(internship.status)}`}>
                          {internship.status}
                        </span>
                      </div>
                      <p className="text-gray-600">{internship.role_name}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/manager/internship/${internship.internship_id}`)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Working Hours</p>
                      <p className="font-medium">{internship.daily_hours}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Students</p>
                      <p className="font-medium">{internship.total_students}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Today's Attendance</p>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-600">{internship.present_today} present</span>
                        <span className="text-gray-400">|</span>
                        <span className="font-medium text-red-600">{internship.absent_today} absent</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Attendance Rate</span>
                      <span>{internship.total_students > 0 ? Math.round((internship.present_today / internship.total_students) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 rounded-full h-2 transition-all"
                        style={{ width: `${internship.total_students > 0 ? (internship.present_today / internship.total_students) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ManagerDashboard