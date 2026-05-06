import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { 
  AcademicCapIcon, 
  ClockIcon, 
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import api from '../../services/api'
import toast from 'react-hot-toast'

const StudentDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [autoTracking, setAutoTracking] = useState(false)
  const [trackingInterval, setTrackingInterval] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [todayProofs, setTodayProofs] = useState([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState(null)

  useEffect(() => {
    fetchDashboard()
    fetchTodayProofs()
    
    // Check for active tracking
    const savedTracking = localStorage.getItem('autoTracking')
    const savedStartTime = localStorage.getItem('sessionStartTime')
    
    if (savedTracking === 'true' && savedStartTime) {
      setAutoTracking(true)
      setSessionStartTime(parseInt(savedStartTime))
      const timerInterval = startElapsedTimer(parseInt(savedStartTime))
      return () => clearInterval(timerInterval)
    }
  }, [])

  const startElapsedTimer = (startTime) => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)
    return interval
  }

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/api/student/dashboard')
      console.log('Dashboard:', response.data)
      setDashboard(response.data)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchTodayProofs = async () => {
    try {
      const response = await api.get('/api/student/attendance/today')
      setTodayProofs(response.data.proofs || [])
    } catch (error) {
      console.error('Error fetching proofs:', error)
    }
  }

  const submitProof = async (proofType, location) => {
    if (!dashboard?.active_internship) {
      toast.error('No active internship found')
      return false
    }

    setSubmitting(true)
    try {
      const payload = {
        internship_id: dashboard.active_internship.internship_id,
        student_id: user.userId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        proof_type: proofType
      }
      
      const response = await api.post('/api/student/attendance/submit', payload)
      
      await fetchTodayProofs()
      await fetchDashboard()
      
      if (response.data.verified) {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          dashboard.active_internship.company_location.lat,
          dashboard.active_internship.company_location.lng
        )
        toast.success(`✓ ${proofType} verified! (${Math.round(distance)}m)`)
        return true
      } else {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          dashboard.active_internship.company_location.lat,
          dashboard.active_internship.company_location.lng
        )
        toast.error(`✗ ${proofType} failed! ${Math.round(distance)}m away`)
        return false
      }
    } catch (error) {
      console.error('Proof submission failed:', error)
      toast.error(error.response?.data?.detail || 'Submission failed')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const startAutoTracking = async () => {
    const internship = dashboard?.active_internship
    
    // Check if can start
    if (!internship?.can_start) {
      toast.error(internship?.status_message || 'Cannot start session now')
      return
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }

    const intervalMinutes = internship.proof_interval_minutes || 1
    const totalMinutes = internship.total_minutes || 60
    
    toast.success(`Starting session at ${new Date().toLocaleTimeString()}`)
    
    // Submit entry proof
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await submitProof('entry', position)
        
        const startTime = Date.now()
        setSessionStartTime(startTime)
        localStorage.setItem('sessionStartTime', startTime.toString())
        
        const timerInterval = startElapsedTimer(startTime)
        
        let proofCount = 1
        let exitSubmitted = false
        
        const interval = setInterval(async () => {
          proofCount++
          
          // Check if session should end
          const currentTime = new Date()
          const currentHour = currentTime.getHours()
          const currentMinute = currentTime.getMinutes()
          const endHour = parseInt(internship.daily_end.split(':')[0])
          const endMinute = parseInt(internship.daily_end.split(':')[1])
          
          const shouldEnd = (currentHour > endHour) || 
                           (currentHour === endHour && currentMinute >= endMinute)
          
          if (shouldEnd && !exitSubmitted) {
            exitSubmitted = true
            clearInterval(interval)
            clearInterval(timerInterval)
            
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                await submitProof('exit', pos)
                toast.success('Session completed!')
                setAutoTracking(false)
                setTrackingInterval(null)
                localStorage.removeItem('autoTracking')
                localStorage.removeItem('sessionStartTime')
                setElapsedSeconds(0)
              },
              (err) => console.error(err)
            )
            return
          }
          
          // Submit hourly proof
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              await submitProof('hourly', position)
              await fetchTodayProofs()
            },
            (error) => console.error('Location error:', error)
          )
        }, intervalMinutes * 60 * 1000)
        
        setTrackingInterval(interval)
        setAutoTracking(true)
        localStorage.setItem('autoTracking', 'true')
      },
      (error) => {
        toast.error('Could not get location')
      }
    )
  }

  const stopAutoTracking = async () => {
    if (trackingInterval) {
      clearInterval(trackingInterval)
      setTrackingInterval(null)
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await submitProof('exit', position)
        await fetchTodayProofs()
        setAutoTracking(false)
        localStorage.removeItem('autoTracking')
        localStorage.removeItem('sessionStartTime')
        setElapsedSeconds(0)
        toast.success('Session stopped')
      },
      (error) => {
        toast.error('Could not submit exit proof')
      }
    )
  }

  const handleLogout = () => {
    if (autoTracking) {
      stopAutoTracking()
    }
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

  const internship = dashboard?.active_internship
  const totalMinutes = internship?.total_minutes || 0
  const elapsedMinutes = Math.min(Math.floor(elapsedSeconds / 60), totalMinutes)
  const remainingMinutes = Math.max(totalMinutes - elapsedMinutes, 0)
  const progressPercent = totalMinutes > 0 ? (elapsedMinutes / totalMinutes) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <AcademicCapIcon className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">ZKAttend</span>
              <span className="ml-2 text-sm text-gray-500">Student Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {dashboard?.student?.full_name || user.fullName}</span>
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
        {/* Time Spent Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-100 rounded-full">
              <ClockIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Time Spent at Location</p>
              <p className="text-3xl font-bold text-gray-900">
                {autoTracking ? `${elapsedMinutes}m ${elapsedSeconds % 60}s` : '0m 0s'}
              </p>
              {autoTracking && totalMinutes > 0 && (
                <p className="text-xs text-gray-500">Target: {totalMinutes} minutes</p>
              )}
            </div>
          </div>
        </div>

        {/* Internship Card */}
        {internship ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            <div className={`bg-gradient-to-r px-6 py-4 ${internship.is_test_mode ? 'from-yellow-600 to-orange-600' : 'from-indigo-600 to-purple-600'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">Active Internship</h2>
                  <p className="text-indigo-100">{internship.company_name} - {internship.role_name}</p>
                  <p className="text-sm text-white mt-1">
                    🕐 Schedule: {internship.daily_start} - {internship.daily_end}
                  </p>
                </div>
                <div>
                  {!autoTracking ? (
                    <button
                      onClick={startAutoTracking}
                      disabled={submitting || !internship.can_start}
                      className={`inline-flex items-center px-4 py-2 rounded-lg disabled:opacity-50 ${
                        internship.can_start 
                          ? 'bg-green-500 text-white hover:bg-green-600' 
                          : 'bg-gray-400 text-white cursor-not-allowed'
                      }`}
                    >
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Start Auto-Tracking
                    </button>
                  ) : (
                    <button
                      onClick={stopAutoTracking}
                      disabled={submitting}
                      className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      <StopIcon className="h-5 w-5 mr-2" />
                      Stop Tracking
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Status Message */}
              {!internship.can_start && !autoTracking && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-yellow-800">{internship.status_message}</span>
                  </div>
                </div>
              )}

              {/* Progress Section */}
              {autoTracking && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Session Progress</span>
                    <span className="text-sm font-medium text-indigo-600">
                      {elapsedMinutes} / {totalMinutes} min
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`rounded-full h-3 transition-all duration-500 ${progressPercent >= 100 ? 'bg-green-600' : 'bg-indigo-600'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {remainingMinutes > 0 && (
                    <div className="mt-2 text-center">
                      <span className="text-sm text-orange-600 font-medium">
                        ⏱️ Session ends in: {remainingMinutes} minutes
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Location Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <MapPinIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="font-medium text-gray-700">Company Location</span>
                </div>
                <p className="text-sm text-gray-600">
                  {internship.company_location?.lat?.toFixed(6)}, {internship.company_location?.lng?.toFixed(6)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Verification radius: {internship.radius} meters
                </p>
                {internship.is_test_mode && (
                  <p className="text-xs text-blue-600 mt-2">
                    ⚡ Auto-fetch every {internship.proof_interval_minutes} minute(s)
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 text-center">
            <p className="text-yellow-800">No active internship assigned.</p>
          </div>
        )}

        {/* Timeline */}
        {todayProofs.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Timeline</h2>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {todayProofs.map((proof, idx) => (
                  <div key={idx} className="p-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-mono font-bold text-gray-700 w-24">
                        {proof.time}
                      </div>
                      <div className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        proof.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {proof.type}
                      </div>
                      {proof.verified ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${proof.verified ? 'text-green-600' : 'text-red-600'}`}>
                        {proof.verified 
                          ? `✓ Verified (${Math.round(proof.distance)}m)` 
                          : `✗ Failed (${Math.round(proof.distance)}m away)`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentDashboard