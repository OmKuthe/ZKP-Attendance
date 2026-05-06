import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, MapPinIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'
import toast from 'react-hot-toast'

const StudentTimeline = () => {
  const { studentId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const internshipId = searchParams.get('internship')
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchTimeline()
  }, [selectedDate])

  const fetchTimeline = async () => {
    try {
      const response = await api.get(`/api/manager/student/${studentId}/timeline`, {
        params: {
          internship_id: internshipId,
          date_param: selectedDate
        }
      })
      setTimeline(response.data)
    } catch (error) {
      console.error('Error fetching timeline:', error)
      toast.error('Failed to load student timeline')
    } finally {
      setLoading(false)
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
      <div className="max-w-4xl mx-auto px-4">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Student Timeline</h2>
            <p className="text-gray-600">Student ID: {studentId}</p>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-6">
            {/* Summary Card */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Hours</p>
                  <p className="text-2xl font-bold text-indigo-600">{timeline.total_hours} hrs</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    timeline.status === 'full_day' ? 'bg-green-100 text-green-800' :
                    timeline.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {timeline.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Proof Timeline</h3>
            
            {timeline.proofs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No proofs recorded for this date
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                <div className="space-y-6">
                  {timeline.proofs.map((proof, idx) => (
                    <div key={idx} className="relative flex items-start">
                      <div className="z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-indigo-500">
                        {proof.type === 'entry' ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-500" />
                        ) : proof.type === 'exit' ? (
                          <CheckCircleIcon className="h-6 w-6 text-red-500" />
                        ) : (
                          <ClockIcon className="h-6 w-6 text-blue-500" />
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-semibold text-gray-900">{proof.time}</span>
                              <span className="ml-2 text-sm text-gray-500 capitalize">{proof.type} Proof</span>
                            </div>
                            {proof.distance && (
                              <span className="text-xs text-gray-500">{Math.round(proof.distance)}m from center</span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {proof.latitude.toFixed(6)}, {proof.longitude.toFixed(6)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentTimeline