import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  MapPinIcon,
  ClockIcon,
  ArrowLeftIcon,
  MapIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import api from '../../services/api'

const CreateSession = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)

  // ✅ FIXED: moved hooks here (top level)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [newSession, setNewSession] = useState(null)

  const [formData, setFormData] = useState({
    lat: '',
    lng: '',
    radius: 100,
    duration_minutes: 60,
    department: '',
    subject: ''
  })

  const [location, setLocation] = useState(null)

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setFormData({ ...formData, lat, lng })
        setLocation({ lat, lng })
      },
      (error) => {
        alert('Error getting location: ' + error.message)
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.lat || !formData.lng) {
      alert('Please set class location')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/api/session/start', null, {
        params: {
          faculty_id: user.userId,
          lat: formData.lat,
          lng: formData.lng,
          radius: formData.radius,
          duration_minutes: formData.duration_minutes,
          department: formData.department || undefined,
          subject: formData.subject
        }
      })

      if (response.data) {
        setNewSession(response.data)
        setShowSessionModal(true)
      }

    } catch (error) {
      console.error(error)
      alert('Error creating session: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">

        {/* Back Button */}
        <button
          onClick={() => navigate('/faculty')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back to Dashboard
        </button>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <h2 className="text-2xl font-bold text-white">Create New Session</h2>
            <p className="text-indigo-100">Set up your class location and session details</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* Location */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2 text-indigo-600" />
                Class Location
              </h3>

              {!location ? (
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="w-full flex justify-center items-center px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  <MapIcon className="h-5 w-5 mr-2" />
                  Use Current Location
                </button>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 font-medium">Location Set!</p>
                  <p className="text-sm text-green-700">
                    Lat: {location.lat.toFixed(6)} <br />
                    Lng: {location.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Latitude"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                className="p-2 border rounded"
              />
              <input
                type="number"
                placeholder="Longitude"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                className="p-2 border rounded"
              />
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                value={formData.radius}
                onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) })}
                className="p-2 border rounded"
              />
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                className="p-2 border rounded"
              />
            </div>

            {/* Subject */}
            <input
              type="text"
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full p-2 border rounded"
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </form>
        </div>
      </div>

      {/* ✅ Modal */}
      {showSessionModal && newSession && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-96 text-center">

            <CheckCircleIcon className="h-10 w-10 text-green-500 mx-auto mb-3" />

            <h3 className="text-lg font-bold">Session Created</h3>

            <p className="mt-2 text-sm text-gray-600">
              Share this code:
            </p>

            <div className="bg-gray-100 p-2 rounded mt-2 font-mono">
              {newSession.session_nonce}
            </div>

            <button
              onClick={() => navigate('/faculty')}
              className="mt-4 w-full bg-indigo-600 text-white py-2 rounded"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateSession