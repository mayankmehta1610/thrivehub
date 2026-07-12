import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { wakeApi, NETWORK_ERROR } from '../api/client'

function isNetworkFailure(err) {
  return err?.isNetwork || err?.name === 'NetworkError' || err?.message === NETWORK_ERROR
}

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', display_name: '', username: '' })
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle')
  const [unreachable, setUnreachable] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const runRegister = async (e) => {
    e?.preventDefault()
    setError('')
    setUnreachable(false)

    setStatus('waking')
    const awake = await wakeApi()
    if (!awake) {
      setError(NETWORK_ERROR)
      setUnreachable(true)
      setStatus('error')
      return
    }

    setStatus('submitting')
    try {
      await register(form)
      navigate('/feed')
    } catch (err) {
      setError(err.message)
      setUnreachable(isNetworkFailure(err))
      setStatus('error')
    }
  }

  const busy = status === 'waking' || status === 'submitting'
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">T</div>
          <h1 className="text-2xl font-bold text-slate-900">Join ThriveHub</h1>
          <p className="text-slate-500 mt-1">Showcase your skills, sports & adventures</p>
        </div>

        {status === 'waking' && (
          <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-md text-sm border border-amber-100 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Waking up server...
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-100">
            {error}
            {unreachable && (
              <button
                type="button"
                onClick={runRegister}
                className="mt-2 block w-full py-2 rounded-md bg-red-100 hover:bg-red-200 text-red-800 font-medium transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        )}

        <form onSubmit={runRegister} className="space-y-4">
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
                disabled={busy}
                className="w-full px-4 py-2.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 disabled:opacity-60"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {status === 'waking' && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === 'waking' ? 'Waking up server...' : status === 'submitting' ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already a member? <Link to="/login" className="text-orange-500 font-medium hover:text-orange-600">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
