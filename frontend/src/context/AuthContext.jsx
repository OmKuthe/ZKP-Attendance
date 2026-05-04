import React, { createContext, useState, useContext, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setUser(JSON.parse(userData))
    }
    setLoading(false)
  }, [])

  const login = async (userType, credentials) => {
    try {
      let endpoint = ''
      if (userType === 'admin') {
        endpoint = '/api/auth/admin/login'
      } else if (userType === 'faculty') {
        endpoint = '/api/auth/faculty/login'
      } else {
        endpoint = '/api/auth/student/login'
      }

      const response = await api.post(endpoint, credentials)
      const { token, user_type, user_id, full_name } = response.data
      
      const userData = { token, userType: user_type, userId: user_id, fullName: full_name }
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      
      return { success: true, userType: user_type }
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}