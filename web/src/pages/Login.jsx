import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { wakeApi, NETWORK_ERROR, WAKE_TIMEOUT_MS } from '../api/client'
import { consumeAuthMessage } from '../hooks/useRequireAuth'

function isNetworkFailure(err) {
  return err?.isNetwork || err?.name === 'NetworkError' || err?.message === NETWORK_ERROR
}

export default function Login() {
  const [email, setEmail] = useState('alex@thrivehub.com')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState('')
  const [apiReady, setApiReady] = useState(false)
  const [status, setStatus] = useState('waking') // waking | idle | submitting | error
  const [unreachable, setUnreachable] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/feed'

  useEffect(() => {
    const message = searchParams.get('message') || consumeAuthMessage()
    if (message) toast.error(message)
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    wakeApi({ maxWaitMs: WAKE_TIMEOUT_MS })
      .then((ok) => {
        if (cancelled) return
        setApiReady(ok)
        if (!ok) {
          setError(NETWORK_ERROR)
          setUnreachable(true)
          setStatus('error')
        } else {
          setStatus('idle')
        }
      })
    return () => { cancelled = true }
  }, [])

  const ensureApiReady = async () => {
    if (apiReady) return true
    setStatus('waking')
    setError('')
    setUnreachable(false)
    const ok = await wakeApi({ maxWaitMs: WAKE_TIMEOUT_MS })
    setApiReady(ok)
    if (!ok) {
      setError(NETWORK_ERROR)
      setUnreachable(true)
      setStatus('error')
    } else {
      setStatus('idle')
    }
    return ok
  }

  const runLogin = async (e) => {
    e?.preventDefault()
    const ready = await ensureApiReady()
    if (!ready) return

    setStatus('submitting')
    try {
      await login(email, password)
      navigate(redirectTo.startsWith('/') ? redirectTo : '/feed', { replace: true })
    } catch (err) {
      setError(err.message)
      setUnreachable(isNetworkFailure(err))
      setStatus('error')
    }
  }

  const retryWakeAndLogin = async () => {
    setApiReady(false)
    await runLogin()
  }

  const waking = status === 'waking'
  const busy = waking || status === 'submitting'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl p-8 border border-slate-200">
        {waking && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="mt-4 text-slate-800 font-semibold">Waking up server...</p>
            <p className="mt-1 text-slate-500 text-sm text-center px-6">
              Free tier can take up to 90 seconds. Please wait.
            </p>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">T</div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 mt-1">Sign in to your ThriveHub account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-100">
            {error}
            {unreachable && (
              <button
                type="button"
                onClick={retryWakeAndLogin}
                className="mt-2 block w-full py-2 rounded-md bg-red-100 hover:bg-red-200 text-red-800 font-medium transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        )}

        <form onSubmit={runLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy || !apiReady}
              className="w-full px-4 py-2.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy || !apiReady}
              className="w-full px-4 py-2.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !apiReady}
            className="w-full py-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {status === 'submitting' && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === 'submitting' ? 'Signing in...' : apiReady ? 'Sign In' : 'Waiting for server...'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          No account? <Link to="/register" className="text-orange-500 font-medium hover:text-orange-600">Join free</Link>
        </p>
        <p className="text-center text-xs text-slate-400 mt-2">Demo: alex@thrivehub.com / demo1234</p>
      </div>
    </div>
  )
}
