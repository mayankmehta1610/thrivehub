import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import DataTable from '../components/DataTable'

export default function Notifications() {
  const [config, setConfig] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const data = await api.getNotifications({ page, page_size: 20, search })
    setItems(data.items)
    setTotal(data.total)
  }, [page, search])

  useEffect(() => {
    api.getConfig().then(setConfig)
    load()
  }, [load])

  const markAllRead = async () => {
    await api.markAllNotificationsRead()
    load()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Bell className="w-7 h-7" /> Notifications
          </h1>
          <button onClick={markAllRead} className="flex items-center gap-1 text-sm text-indigo-600 hover:underline">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        </div>

        <div className="space-y-2 mb-8">
          {items.map((n) => (
            <div key={n.id} className={`bg-white rounded-xl p-4 border ${n.read_at ? 'border-slate-100' : 'border-indigo-200 bg-indigo-50/30'}`}>
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-slate-500">{n.body}</p>
              <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
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
        />
      </div>
    </div>
  )
}
