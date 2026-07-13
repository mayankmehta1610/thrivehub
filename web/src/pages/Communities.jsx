import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Users, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Navbar from '../components/Navbar'
import DataTable from '../components/DataTable'
import SafeImage from '../components/SafeImage'
import RichTextEditor from '../components/RichTextEditor'
import { isValidImageUrl } from '../utils/images'
import { getUploadLimits, getFileSizeError } from '../utils/upload'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'

export default function Communities() {
  const requireAuth = useRequireAuth()
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [communities, setCommunities] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '', cover_url: '' })
  const [uploading, setUploading] = useState(false)
  const coverRef = useRef(null)

  const load = useCallback(async () => {
    const data = await api.getCommunities({ page, page_size: 10, sort_by: sortBy, sort_order: sortOrder, search })
    setCommunities(data.items)
    setTotal(data.total)
  }, [page, sortBy, sortOrder, search])

  useEffect(() => {
    api.getConfig().then(setConfig)
    load()
  }, [load])

  const handleCoverUpload = async (e) => {
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
      setForm((f) => ({ ...f, cover_url: result.url }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!requireAuth(AUTH_MESSAGES.createCommunity)) return
    try {
      const created = await api.createCommunity({ ...form, cover_url: form.cover_url || undefined })
      setShowCreate(false)
      setForm({ name: '', slug: '', description: '', cover_url: '' })
      toast.success('Community created — you are the admin')
      if (created?.slug) navigate(`/communities/${created.slug}`)
      else load()
    } catch (err) {
      toast.error(err?.message || 'Could not create community')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold gradient-text">Communities</h1>
          <button onClick={() => requireAuth(AUTH_MESSAGES.createCommunity) && setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-hero text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Create Community
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {communities.map((c) => (
            <Link key={c.id} to={`/communities/${c.slug}`} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 card-hover">
              {isValidImageUrl(c.cover_url) && (
                <SafeImage src={c.cover_url} alt="" className="w-full h-36 object-cover" hideOnError />
              )}
              <div className="p-4">
                <h3 className="font-bold text-lg">{c.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-violet-500">
                  <Users className="w-4 h-4" /> {c.member_count} members
                </div>
              </div>
            </Link>
          ))}
        </div>

        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'slug', label: 'Slug' },
            { key: 'member_count', label: 'Members' },
            { key: 'visibility', label: 'Visibility' },
          ]}
          data={communities}
          serverMode
          total={total}
          page={page}
          pageSize={10}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onPageChange={setPage}
          onSortChange={(k, o) => { setSortBy(k); setSortOrder(o) }}
          onSearchChange={(s) => { setSearch(s); setPage(1) }}
          onRowClick={(row) => navigate(`/communities/${row.slug}`)}
          searchPlaceholder="Search communities..."
        />
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold">Create Community</h2>

            {/* Cover photo */}
            <div>
              {form.cover_url ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-100">
                  <SafeImage src={form.cover_url} alt="" className="w-full h-32 object-cover" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, cover_url: '' }))}
                    className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs">Remove</button>
                </div>
              ) : (
                <button type="button" onClick={() => coverRef.current?.click()} disabled={uploading}
                  className="w-full h-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-violet-300 hover:text-violet-500 disabled:opacity-50">
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-sm">{uploading ? 'Uploading…' : 'Upload cover photo'}</span>
                </button>
              )}
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </div>

            {['name', 'slug'].map((f) => (
              <input key={f} placeholder={f} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                required className="w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-400" />
            ))}
            <RichTextEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })}
              placeholder="Describe your community…" rows={4} />
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
