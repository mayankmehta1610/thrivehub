import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { wakeApi, NETWORK_ERROR, WAKE_TIMEOUT_MS, formatAuthError } from '../api/client'
import { consumeAuthMessage } from '../hooks/useRequireAuth'

const RETRY_INTERVAL_SEC = 5

function isNetworkFailure(err) {
  return err?.isNetwork || err?.name === 'NetworkError' || err?.message === NETWORK_ERROR
}

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', display_name: '', username: '' })
  const [error, setError] = useState('')
  const [apiReady, setApiReady] = useState(false)
  const [status, setStatus] = useState('waking')
  const [unreachable, setUnreachable] = useState(false)
  const [wakeMessage, setWakeMessage] = useState('Connecting to server...')
  const [retryIn, setRetryIn] = useState(0)
  const retryTimerRef = useRef(null)
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/feed'

  useEffect(() => {
    const message = searchParams.get('message') || consumeAuthMessage()
    if (message) toast.error(message)
  }, [searchParams])

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current)
      retryTimerRef.current = null
    }
    setRetryIn(0)
  }

  const startWake = useCallback(async () => {
    clearRetryTimer()
    setStatus('waking')
    setError('')
    setUnreachable(false)
    setApiReady(false)
    setWakeMessage('Connecting to server...')

    const ok = await wakeApi({
      maxWaitMs: WAKE_TIMEOUT_MS,
      onStatus: (msg) => setWakeMessage(msg),
    })

    if (ok) {
      setApiReady(true)
      setStatus('idle')
      return true
    }

    setError(NETWORK_ERROR)
    setUnreachable(true)
    setStatus('error')
    setRetryIn(RETRY_INTERVAL_SEC)
    retryTimerRef.current = setInterval(() => {
      setRetryIn((prev) => {
        if (prev <= 1) {
          clearRetryTimer()
          startWake()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return false
  }, [])

  useEffect(() => {
    startWake()
    return () => clearRetryTimer()
  }, [startWake])

  const runRegister = async (e) => {
    e?.preventDefault()
    let ready = apiReady
    if (!ready) ready = await startWake()
    if (!ready) return

    setStatus('submitting')
    setError('')
    try {
      await register(form)
      navigate(redirectTo.startsWith('/') ? redirectTo : '/feed', { replace: true })
    } catch (err) {
      setError(formatAuthError(err))
      setUnreachable(isNetworkFailure(err))
      setStatus('error')
    }
  }

  const waking = status === 'waking'
  const busy = waking || status === 'submitting'
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl p-8 border border-slate-200">
        {(waking || !apiReady) && status !== 'submitting' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-lg bg-white/98 backdrop-blur-sm">
            <Loader2 className="w-12 h-12 animate-spin text-violet-500" />
            <p className="mt-4 text-slate-900 font-bold text-lg">{wakeMessage}</p>
            <p className="mt-2 text-slate-500 text-sm text-center px-6">
              Waking up server — free tier can take up to 90 seconds
            </p>
            {retryIn > 0 && (
              <p className="mt-2 text-violet-600 text-sm">Retrying in {retryIn}s...</p>
            )}
          </div>
        )}

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-md gradient-hero flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">T</div>
          <h1 className="text-2xl font-bold text-slate-900">Join ThriveHub</h1>
          <p className="text-slate-500 mt-1">Showcase your skills, sports & adventures</p>
        </div>

        {error && !waking && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-100">
            {error}
            {unreachable && (
              <button
                type="button"
                onClick={() => startWake()}
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
                disabled={busy || !apiReady}
                className="w-full px-4 py-2.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:opacity-60"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={busy || !apiReady}
            className="w-full py-3 rounded-md bg-rose-500 hover:bg-rose-600 text-white font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {status === 'submitting' && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === 'submitting' ? 'Creating account...' : apiReady ? 'Create Account' : 'Connecting to server...'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already a member? <Link to="/login" className="text-violet-600 font-medium hover:text-violet-700">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
