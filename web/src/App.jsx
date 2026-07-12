import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { wakeApi } from './api/client'
import { storeAuthMessage } from './hooks/useRequireAuth'
import { AUTH_MESSAGES } from './utils/authMessages'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import Communities from './pages/Communities'
import CommunityDetail from './pages/CommunityDetail'
import Events from './pages/Events'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import SearchPage from './pages/SearchPage'
import Admin from './pages/Admin'

function AppWake() {
  useEffect(() => {
    wakeApi().catch(() => {})
  }, [])
  return null
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (user) return children
  const redirect = location.pathname + location.search
  storeAuthMessage(AUTH_MESSAGES.default)
  return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}&message=${encodeURIComponent(AUTH_MESSAGES.default)}`} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
      <Route path="/profile/:username" element={<Profile />} />
      <Route path="/communities" element={<PrivateRoute><Communities /></PrivateRoute>} />
      <Route path="/communities/:slug" element={<CommunityDetail />} />
      <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/search" element={<PrivateRoute><SearchPage /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppWake />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: { background: '#1e293b', color: '#fff', fontSize: '14px' },
            error: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
