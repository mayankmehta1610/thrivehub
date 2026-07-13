import { useEffect, useState } from 'react'
import { HelpCircle, ChevronDown, MessageSquarePlus, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'

export default function Help() {
  const { user } = useAuth()
  const requireAuth = useRequireAuth()
  const [config, setConfig] = useState(null)
  const [articles, setArticles] = useState([])
  const [openIdx, setOpenIdx] = useState(0)
  const [form, setForm] = useState({ category: 'general', message: '', rating: 0 })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {})
    api.getHelp().then((d) => setArticles(d.articles || [])).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!requireAuth(AUTH_MESSAGES.default)) return
    if (!form.message.trim()) return
    setSubmitting(true)
    try {
      await api.submitFeedback({ category: form.category, message: form.message.trim(), rating: form.rating || undefined })
      setForm({ category: 'general', message: '', rating: 0 })
      toast.success('Thanks for your feedback! 🙏')
    } catch (err) {
      toast.error(err?.message || 'Could not send feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2 mb-6">
          <HelpCircle className="w-7 h-7" /> Help &amp; Support
        </h1>

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100 mb-8">
          {articles.map((a, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{a.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} />
              </button>
              {openIdx === i && <p className="px-5 pb-4 text-slate-600 leading-relaxed">{a.a}</p>}
            </div>
          ))}
          {articles.length === 0 && <p className="px-5 py-6 text-slate-400">Loading help articles…</p>}
        </div>

        {/* Feedback */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
            <MessageSquarePlus className="w-5 h-5 text-violet-600" /> Send feedback
          </h2>
          <p className="text-sm text-slate-400 mb-4">Report a bug, request a feature, or tell us what you think.</p>
          <form onSubmit={submit} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {['general', 'bug', 'feature', 'other'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, category: c })}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border capitalize ${
                    form.category === c ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="What's on your mind?"
              rows={4}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-500 mr-1">Rate us:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} stars`}>
                  <Star className={`w-6 h-6 ${n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={submitting || !form.message.trim()}
              className="px-5 py-2 rounded-xl gradient-hero text-white font-medium text-sm disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send feedback'}
            </button>
            {!user && <p className="text-xs text-slate-400">You'll be asked to sign in to send feedback.</p>}
          </form>
        </div>
      </div>
    </div>
  )
}
