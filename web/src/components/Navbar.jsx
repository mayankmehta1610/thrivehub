import { Link, useLocation } from 'react-router-dom'
import { Bell, Home, LogOut, MessageCircle, Search, Users, Calendar, Settings, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ config }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const appName = config?.app_name || 'ThriveHub'

  const links = user
    ? [
        { to: '/feed', icon: Home, label: 'Feed' },
        { to: '/communities', icon: Users, label: 'Communities' },
        { to: '/events', icon: Calendar, label: 'Events' },
        { to: '/messages', icon: MessageCircle, label: 'Messages' },
        { to: '/search', icon: Search, label: 'Search' },
        { to: '/notifications', icon: Bell, label: 'Alerts' },
      ]
    : []

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={user ? '/feed' : '/'} className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center text-white font-bold text-lg">
            T
          </div>
          <span className="text-xl font-bold gradient-text">{appName}</span>
        </Link>

        {user && (
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname.startsWith(to)
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link to="/admin" className="p-2 rounded-xl text-slate-500 hover:bg-slate-50">
                  <Settings className="w-5 h-5" />
                </Link>
              )}
              <Link
                to={`/profile/${user.profile?.username}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50"
              >
                <img
                  src={user.profile?.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-100"
                />
                <span className="hidden sm:block text-sm font-medium">{user.profile?.display_name}</span>
              </Link>
              <button onClick={logout} className="p-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500">
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600">
                Log in
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium text-white rounded-xl gradient-hero hover:opacity-90"
              >
                Join Free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
