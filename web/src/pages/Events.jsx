import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, Plus, Check, Image as ImageIcon, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Navbar from '../components/Navbar'
import DataTable from '../components/DataTable'
import SafeImage from '../components/SafeImage'
import RichTextEditor from '../components/RichTextEditor'
import { isValidImageUrl, isVideoUrl, isAudioUrl } from '../utils/images'
import { getUploadLimits, getFileSizeError } from '../utils/upload'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'

const EMPTY_FORM = { title: '', description: '', venue: '', start_at: '', image_url: '' }

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
  const [form, setForm] = useState(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    const data = await api.getEvents({ page, page_size: 10, sort_by: sortBy, sort_order: sortOrder, search })
    setEvents(data.items)
    setTotal(data.total)
  }, [page, sortBy, sortOrder, search])

  useEffect(() => {
    api.getConfig().then(setConfig)
    load()
  }, [load])

  const openCreate = () => {
    if (!requireAuth(AUTH_MESSAGES.createEvent)) return
    setForm(EMPTY_FORM)
    setShowCreate(true)
  }

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const limits = getUploadLimits(config)
    const sizeError = getFileSizeError(file, limits)
    if (sizeError) {
      toast.error(sizeError)
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      const result = await api.uploadMedia(file, limits)
      setForm((f) => ({ ...f, image_url: result.url }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!requireAuth(AUTH_MESSAGES.createEvent)) return
    if (!form.title.trim() || !form.start_at) return
    setCreating(true)
    try {
      await api.createEvent({
        title: form.title.trim(),
        description: form.description || undefined,
        venue: form.venue || undefined,
        image_url: form.image_url || undefined,
        start_at: new Date(form.start_at).toISOString(),
      })
      setShowCreate(false)
      setForm(EMPTY_FORM)
      toast.success('Event created 🎉')
      load()
    } catch (err) {
      toast.error(err?.message || 'Could not create event')
    } finally {
      setCreating(false)
    }
  }

  const handleRegister = async (e, id) => {
    e.stopPropagation()
    if (!requireAuth(AUTH_MESSAGES.registerEvent)) return
    try {
      const res = await api.registerEvent(id)
      toast.success(res?.status === 'already_registered' ? "You're already registered" : "You're registered! 🎉")
      load()
    } catch (err) {
      toast.error(err?.message || 'Could not register for this event')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold gradient-text">Events</h1>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-hero text-white text-sm font-medium">
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
                  {ev.is_registered ? (
                    <span className="px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-medium flex items-center gap-1"><Check className="w-4 h-4" /> Registered</span>
                  ) : (
                    <button onClick={(e) => handleRegister(e, ev.id)} className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition-colors">Register</button>
                  )}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-bold">Create Event</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50"><X className="w-5 h-5" /></button>
            </div>

            <div className="overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500">Title</label>
                <input placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
                  className="w-full mt-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500">Description</label>
                <div className="mt-1">
                  <RichTextEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })}
                    placeholder="Describe your event — use the toolbar for bold, lists and links" rows={5} />
                </div>
              </div>

              {/* Cover media — photo / video / audio */}
              <div>
                <label className="text-xs font-medium text-slate-500">Cover media (optional)</label>
                <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleMediaUpload} />
                {form.image_url ? (
                  <div className="mt-1 relative rounded-xl overflow-hidden border border-slate-100">
                    {isAudioUrl(form.image_url)
                      ? <audio src={form.image_url} controls className="w-full" />
                      : isVideoUrl(form.image_url)
                        ? <video src={form.image_url} controls className="w-full max-h-52 bg-black" />
                        : <SafeImage src={form.image_url} alt="" className="w-full max-h-52 object-cover" />}
                    <button type="button" onClick={() => setForm({ ...form, image_url: '' })}
                      className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs">Remove</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="mt-1 w-full h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-violet-300 hover:text-violet-500 disabled:opacity-50">
                    <ImageIcon className="w-5 h-5 mb-1" />
                    <span className="text-sm">{uploading ? 'Uploading…' : 'Upload photo, video or audio'}</span>
                  </button>
                )}
                <p className="text-[11px] text-slate-400 mt-1">Max 500 KB image · 2 MB video · 5 MB audio.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500">Venue</label>
                  <input placeholder="Where" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    className="w-full mt-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Starts</label>
                  <input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} required
                    className="w-full mt-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-5 py-3 border-t border-slate-100 shrink-0">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={creating || uploading || !form.title.trim() || !form.start_at}
                className="flex-1 py-2 rounded-xl gradient-hero text-white font-medium disabled:opacity-50">
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
