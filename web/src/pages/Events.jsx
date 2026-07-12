import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, Plus } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import DataTable from '../components/DataTable'
import SafeImage from '../components/SafeImage'
import { isValidImageUrl } from '../utils/images'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'

export default function Events() {
  const requireAuth = useRequireAuth()
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [events, setEvents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('start_at')
  const [sortOrder, setSortOrder] = useState('asc')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', venue: '', start_at: '' })

  const load = useCallback(async () => {
    const data = await api.getEvents({ page, page_size: 10, sort_by: sortBy, sort_order: sortOrder, search })
    setEvents(data.items)
    setTotal(data.total)
  }, [page, sortBy, sortOrder, search])

  useEffect(() => {
    api.getConfig().then(setConfig)
    load()
  }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!requireAuth(AUTH_MESSAGES.createEvent)) return
    await api.createEvent({ ...form, start_at: new Date(form.start_at).toISOString() })
    setShowCreate(false)
    load()
  }

  const handleRegister = async (e, id) => {
    e.stopPropagation()
    if (!requireAuth(AUTH_MESSAGES.registerEvent)) return
    await api.registerEvent(id)
    load()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold gradient-text">Events</h1>
          <button onClick={() => requireAuth(AUTH_MESSAGES.createEvent) && setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-hero text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Create Event
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {events.map((ev) => (
            <div
              key={ev.id}
              onClick={() => navigate(`/events/${ev.id}`)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 card-hover cursor-pointer"
            >
              {isValidImageUrl(ev.image_url) && (
                <SafeImage src={ev.image_url} alt="" className="w-full h-40 object-cover" hideOnError />
              )}
              <div className="p-4">
                <h3 className="font-bold text-lg">{ev.title}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <Calendar className="w-4 h-4" /> {new Date(ev.start_at).toLocaleString()}
                </p>
                {ev.venue && <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-4 h-4" />{ev.venue}</p>}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-fuchsia-500 flex items-center gap-1"><Users className="w-4 h-4" />{ev.participant_count}{ev.capacity ? `/${ev.capacity}` : ''}</span>
                  <button onClick={(e) => handleRegister(e, ev.id)} className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition-colors">Register</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <DataTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'venue', label: 'Venue' },
            { key: 'participant_count', label: 'Participants' },
            { key: 'status', label: 'Status' },
            { key: 'start_at', label: 'Start', render: (r) => new Date(r.start_at).toLocaleDateString() },
          ]}
          data={events}
          serverMode
          total={total}
          page={page}
          pageSize={10}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onPageChange={setPage}
          onSortChange={(k, o) => { setSortBy(k); setSortOrder(o) }}
          onSearchChange={(s) => { setSearch(s); setPage(1) }}
          onRowClick={(row) => navigate(`/events/${row.id}`)}
        />
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Create Event</h2>
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full px-4 py-2 rounded-xl border" />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border" />
            <input placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="w-full px-4 py-2 rounded-xl border" />
            <input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} required className="w-full px-4 py-2 rounded-xl border" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-xl border">Cancel</button>
              <button type="submit" className="flex-1 py-2 rounded-xl gradient-hero text-white font-medium">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
