import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      api.getMe()
        .then(setUser)
        .catch(() => api.clearTokens())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password, otp) => {
    const tokens = await api.login(email, password, otp)
    api.setTokens(tokens.access_token, tokens.refresh_token)
    const me = await api.getMe()
    setUser(me)
    return me
  }

  const register = async (data) => {
    const tokens = await api.register(data)
    api.setTokens(tokens.access_token, tokens.refresh_token)
    const me = await api.getMe()
    setUser(me)
    return me
  }

  const logout = () => {
    api.clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
