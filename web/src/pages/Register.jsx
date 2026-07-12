import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', display_name: '', username: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/feed')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #eef2ff, #fdf2f8, #f0fdfa)' }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-hero flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">T</div>
          <h1 className="text-2xl font-bold gradient-text">Join ThriveHub</h1>
          <p className="text-slate-500 mt-1">Showcase your skills, sports & adventures</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {['display_name', 'username', 'email', 'password'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">
                {field.replace('_', ' ')}
              </label>
              <input
                type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                value={form[field]}
                onChange={(e) => update(field, e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl gradient-hero text-white font-bold disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already a member? <Link to="/login" className="text-indigo-600 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
