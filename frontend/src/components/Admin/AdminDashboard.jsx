import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { 
  UsersIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  CheckCircleIcon,
  AcademicCapIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import api from '../../services/api'

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    total_students: 0,
    total_faculty: 0,
    total_sessions: 0,
    total_attendances: 0,
    departments: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/admin/dashboard/stats', {
        params: { admin_token: 'admin_secret_key_2026' }
      })
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { title: 'Manage Students', icon: UsersIcon, path: '/admin/students', color: 'bg-blue-500' },
    { title: 'Manage Faculty', icon: UserGroupIcon, path: '/admin/faculty', color: 'bg-green-500' },
    { title: 'Monitor Sessions', icon: CalendarIcon, path: '/admin/sessions', color: 'bg-purple-500' }
  ]

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
              <span className="ml-2 text-xl font-semibold text-gray-900">ZKAttend Admin</span>
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_students}</p>
              </div>
              <UsersIcon className="h-12 w-12 text-blue-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Faculty</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_faculty}</p>
              </div>
              <UserGroupIcon className="h-12 w-12 text-green-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Sessions</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_sessions}</p>
              </div>
              <CalendarIcon className="h-12 w-12 text-purple-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Attendances</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_attendances}</p>
              </div>
              <CheckCircleIcon className="h-12 w-12 text-green-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Department Stats */}
        {stats.departments && stats.departments.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Distribution</h3>
            <div className="space-y-3">
              {stats.departments.map((dept, idx) => (
                <div key={idx} className="flex items-center">
                  <span className="w-32 text-sm text-gray-600">{dept.department}</span>
                  <div className="flex-1 ml-4">
                    <div className="bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-indigo-600 rounded-full h-4 transition-all duration-500"
                        style={{ width: `${(dept.count / stats.total_students) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="ml-4 text-sm text-gray-600">{dept.count} students</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {menuItems.map((item) => (
            <button
              key={item.title}
              onClick={() => navigate(item.path)}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className={`inline-flex p-3 rounded-full ${item.color} bg-opacity-10 mb-4`}>
                <item.icon className={`h-6 w-6 ${item.color.replace('bg-', 'text-')}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-500 mt-1">Click to manage</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard