import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import DataTable from '../components/DataTable'
import SafeImage from '../components/SafeImage'
import { isValidImageUrl } from '../utils/images'

export default function Communities() {
  const [config, setConfig] = useState(null)
  const [communities, setCommunities] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '' })

  const load = useCallback(async () => {
    const data = await api.getCommunities({ page, page_size: 10, sort_by: sortBy, sort_order: sortOrder, search })
    setCommunities(data.items)
    setTotal(data.total)
  }, [page, sortBy, sortOrder, search])

  useEffect(() => {
    api.getConfig().then(setConfig)
    load()
  }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    await api.createCommunity(form)
    setShowCreate(false)
    setForm({ name: '', slug: '', description: '' })
    load()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold gradient-text">Communities</h1>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-hero text-white text-sm font-medium">
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
                <div className="flex items-center gap-1 mt-2 text-sm text-indigo-500">
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
          searchPlaceholder="Search communities..."
        />
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Create Community</h2>
            {['name', 'slug', 'description'].map((f) => (
              <input key={f} placeholder={f} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                required={f !== 'description'} className="w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            ))}
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
