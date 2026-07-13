import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Link2, Check, X, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Navbar from '../components/Navbar'
import DataTable from '../components/DataTable'
import SafeImage from '../components/SafeImage'

export default function Notifications() {
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [requests, setRequests] = useState([])

  const load = useCallback(async () => {
    const data = await api.getNotifications({ page, page_size: 20, search })
    setItems(data.items)
    setTotal(data.total)
  }, [page, search])

  const loadRequests = useCallback(() => {
    api.getConnectionRequests().then(setRequests).catch(() => setRequests([]))
  }, [])

  useEffect(() => {
    api.getConfig().then(setConfig)
    load()
    loadRequests()
  }, [load, loadRequests])

  const markAllRead = async () => {
    await api.markAllNotificationsRead()
    load()
  }

  const openNotification = (n) => {
    if (!n?.link) return
    if (!n.read_at) api.markNotificationRead(n.id).catch(() => {})
    navigate(n.link)
  }

  const respond = async (userId, accept) => {
    try {
      if (accept) {
        await api.acceptConnection(userId)
        toast.success('Connected 🤝')
      } else {
        await api.removeConnection(userId)
        toast.success('Request declined')
      }
      loadRequests()
    } catch (err) {
      toast.error(err?.message || 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Bell className="w-7 h-7" /> Notifications
          </h1>
          <button onClick={markAllRead} className="flex items-center gap-1 text-sm text-violet-600 hover:underline">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        </div>

        {requests.length > 0 && (
          <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-4 mb-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-violet-600" /> Connection requests ({requests.length})
            </h2>
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.user?.id} className="flex items-center gap-3">
                  <Link to={`/profile/${r.user?.username}`}>
                    <SafeImage src={r.user?.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${r.user?.username}`} className="font-medium text-slate-800 hover:text-violet-600 truncate block">
                      {r.user?.display_name}
                    </Link>
                    <p className="text-xs text-slate-400">wants to connect</p>
                  </div>
                  <button onClick={() => respond(r.user?.id, true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700">
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button onClick={() => respond(r.user?.id, false)} title="Decline"
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 mb-8">
          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => openNotification(n)}
              className={`bg-white rounded-xl p-4 border flex items-center gap-3 ${n.read_at ? 'border-slate-100' : 'border-violet-200 bg-violet-50/30'} ${n.link ? 'cursor-pointer hover:border-violet-300 hover:bg-violet-50/50' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-slate-500">{n.body}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {n.link && <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />}
            </div>
          ))}
          {items.length === 0 && <p className="text-slate-400 text-sm">No notifications yet.</p>}
        </div>

        <DataTable
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'title', label: 'Title' },
            { key: 'body', label: 'Message' },
            { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleString() },
          ]}
          data={items}
          serverMode
          total={total}
          page={page}
          pageSize={20}
          onPageChange={setPage}
          onSearchChange={(s) => { setSearch(s); setPage(1) }}
          onRowClick={(row) => openNotification(row)}
        />
      </div>
    </div>
  )
}
