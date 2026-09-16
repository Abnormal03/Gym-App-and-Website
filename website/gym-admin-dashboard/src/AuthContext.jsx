import React, { createContext, useContext, useState, useCallback } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('gym_admin_token'))
  const [admin, setAdmin] = useState(null)

  const login = useCallback(async (email, password) => {
    const res = await api.adminLogin(email, password)
    const jwt = res.token || res.accessToken || res.jwt
    if (!jwt) throw new Error('Login succeeded but no token was returned by the API')
    sessionStorage.setItem('gym_admin_token', jwt)
    setToken(jwt)
    setAdmin(res.user || res.admin || null)
    return jwt
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('gym_admin_token')
    setToken(null)
    setAdmin(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
