import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { 
  ArrowLeftIcon, 
  UsersIcon, 
  ClockIcon, 
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import api from '../../services/api'
import toast from 'react-hot-toast'

const InternshipDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [internship, setInternship] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchDetails()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDetails, 30000)
    return () => clearInterval(interval)
  }, [id])

  const fetchDetails = async () => {
    try {
      const response = await api.get(`/api/manager/internship/${id}`)
      setInternship(response.data.internship)
      setStudents(response.data.students)
    } catch (error) {
      console.error('Error fetching details:', error)
      toast.error('Failed to load internship details')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async () => {
    try {
      const response = await api.get(`/api/manager/internship/${id}/export`, {
        params: {
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        }
      })
      
      // Create download link
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `internship_${id}_report.json`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Failed to export report')
    }
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || 
                         (filter === 'present' && student.today_status !== 'absent') ||
                         (filter === 'absent' && student.today_status === 'absent')
    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status) => {
    switch(status) {
      case 'full_day': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Full Day</span>
      case 'partial': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Partial</span>
      case 'absent': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Absent</span>
      default: return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Not Started</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!internship) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <p className="text-red-800">Internship not found</p>
            <button onClick={() => navigate('/manager')} className="mt-4 text-indigo-600">Go Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <button onClick={() => navigate('/manager')} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back to Dashboard
        </button>

        {/* Internship Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{internship.company_name}</h2>
              <p className="text-gray-600 mt-1">{internship.role_name}</p>
              <p className="text-gray-500 text-sm mt-2">{internship.description}</p>
            </div>
            <button
              onClick={exportReport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Working Hours</p>
                <p className="font-medium">{internship.daily_start_time} - {internship.daily_end_time}</p>
              </div>
            </div>
            <div className="flex items-center">
              <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Location & Radius</p>
                <p className="font-medium text-sm">
                  {internship.company_location?.lat?.toFixed(4)}, {internship.company_location?.lng?.toFixed(4)}<br/>
                  Radius: {internship.radius}m
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Attendance Summary</p>
                <p className="font-medium">
                  <span className="text-green-600">{filteredStudents.filter(s => s.today_status !== 'absent').length} Present</span>
                  {' / '}
                  <span className="text-red-600">{filteredStudents.filter(s => s.today_status === 'absent').length} Absent</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Students ({filteredStudents.length})</h3>
              
              <div className="flex gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Students</option>
                  <option value="present">Present Only</option>
                  <option value="absent">Absent Only</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID / Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Today's Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Proof</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.student_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{student.student_id}</div>
                      <div className="text-xs text-gray-400">Roll: {student.roll_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.today_hours} hrs</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(student.today_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.last_proof_time ? (
                        <div className="text-sm text-gray-500">
                          {new Date(student.last_proof_time).toLocaleTimeString()}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No proof</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/manager/student/${student.student_id}/timeline?internship=${id}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredStudents.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No students found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InternshipDetails