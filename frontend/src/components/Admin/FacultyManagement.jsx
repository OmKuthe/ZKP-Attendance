import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrashIcon, UserPlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'

const FacultyManagement = () => {
  const navigate = useNavigate()
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    faculty_id: '',
    email: '',
    full_name: '',
    department: '',
    designation: '',
    phone_number: '',
    password: ''
  })

  useEffect(() => {
    fetchFaculty()
  }, [])

  const fetchFaculty = async () => {
    try {
      const response = await api.get('/api/admin/faculty/list', {
        params: { admin_token: 'admin_secret_key_2026' }
      })
      setFaculty(response.data.faculty)
    } catch (error) {
      console.error('Error fetching faculty:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFaculty = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/admin/faculty/create', formData, {
        params: { admin_token: 'admin_secret_key_2026' }
      })
      alert('Faculty created successfully!')
      setShowModal(false)
      setFormData({
        faculty_id: '',
        email: '',
        full_name: '',
        department: '',
        designation: '',
        phone_number: '',
        password: ''
      })
      fetchFaculty()
    } catch (error) {
      alert('Error creating faculty: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeleteFaculty = async (facultyId) => {
    if (confirm(`Are you sure you want to delete faculty ${facultyId}?`)) {
      try {
        await api.delete(`/api/admin/faculty/${facultyId}`, {
          params: { admin_token: 'admin_secret_key_2026' }
        })
        alert('Faculty deleted successfully!')
        fetchFaculty()
      } catch (error) {
        alert('Error deleting faculty: ' + (error.response?.data?.detail || error.message))
      }
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Faculty Management</h2>
              <p className="text-gray-600">Manage all faculty members</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add Faculty
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {faculty.map((fac) => (
                  <tr key={fac.faculty_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{fac.faculty_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fac.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fac.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fac.designation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fac.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDeleteFaculty(fac.faculty_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Faculty Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Faculty</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateFaculty} className="space-y-4">
              <input
                type="text"
                placeholder="Faculty ID"
                value={formData.faculty_id}
                onChange={(e) => setFormData({...formData, faculty_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="text"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="text"
                placeholder="Department"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="text"
                placeholder="Designation"
                value={formData.designation}
                onChange={(e) => setFormData({...formData, designation: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone_number}
                onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default FacultyManagement