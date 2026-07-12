import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { AUTH_MESSAGES } from '../utils/authMessages'

const AUTH_MESSAGE_KEY = 'auth_redirect_message'

export function storeAuthMessage(message) {
  sessionStorage.setItem(AUTH_MESSAGE_KEY, message)
}

export function consumeAuthMessage() {
  const message = sessionStorage.getItem(AUTH_MESSAGE_KEY)
  if (message) sessionStorage.removeItem(AUTH_MESSAGE_KEY)
  return message
}

export function useRequireAuth() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const requireAuth = useCallback((message = AUTH_MESSAGES.default) => {
    if (user) return true

    toast.error(message)
    storeAuthMessage(message)

    const redirect = location.pathname + location.search
    const params = new URLSearchParams({
      redirect,
      message,
    })
    navigate(`/login?${params.toString()}`)
    return false
  }, [user, navigate, location])

  return requireAuth
}
