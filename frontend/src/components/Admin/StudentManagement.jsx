import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  ArrowLeftIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'
import api from '../../services/api'

const StudentManagement = () => {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    student_id: '',
    email: '',
    full_name: '',
    roll_number: '',
    department: '',
    year: '',
    semester: '',
    phone_number: ''
  })

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const response = await api.get('/api/admin/students/list', {
        params: { admin_token: 'admin_secret_key_2026' }
      })
      setStudents(response.data.students)
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStudent = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/admin/students/create', formData, {
        params: { admin_token: 'admin_secret_key_2026' }
      })
      alert('Student created successfully!')
      setShowModal(false)
      setFormData({
        student_id: '',
        email: '',
        full_name: '',
        roll_number: '',
        department: '',
        year: '',
        semester: '',
        phone_number: ''
      })
      fetchStudents()
    } catch (error) {
      alert('Error creating student: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeleteStudent = async (studentId) => {
    if (confirm(`Are you sure you want to delete student ${studentId}?`)) {
      try {
        await api.delete(`/api/admin/students/${studentId}`, {
          params: { admin_token: 'admin_secret_key_2026' }
        })
        alert('Student deleted successfully!')
        fetchStudents()
      } catch (error) {
        alert('Error deleting student: ' + (error.response?.data?.detail || error.message))
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
              <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
              <p className="text-gray-600">Manage all students in the system</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add Student
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year/Sem</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.student_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.student_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.roll_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.year}/{student.semester}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDeleteStudent(student.student_id)}
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

      {/* Create Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Student</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <input
                type="text"
                placeholder="Student ID"
                value={formData.student_id}
                onChange={(e) => setFormData({...formData, student_id: e.target.value})}
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
                placeholder="Roll Number"
                value={formData.roll_number}
                onChange={(e) => setFormData({...formData, roll_number: e.target.value})}
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
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Year"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <input
                  type="number"
                  placeholder="Semester"
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone_number}
                onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
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

export default StudentManagement