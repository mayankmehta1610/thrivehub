import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import DataTable from '../components/DataTable'
import SafeImage from '../components/SafeImage'
import { isValidImageUrl } from '../utils/images'

// Map a search result to the page it should open (or null if none exists).
function resultPath(r) {
  if (r.entity_type === 'profile') return `/profile/${(r.subtitle || '').replace(/^@/, '')}`
  if (r.entity_type === 'community') return r.subtitle ? `/communities/${r.subtitle}` : null
  if (r.entity_type === 'event') return `/events/${r.id}`
  return null
}

export default function SearchPage() {
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searched, setSearched] = useState(false)

  useEffect(() => { api.getConfig().then(setConfig) }, [])

  const runSearch = async (targetPage = 1) => {
    if (!query.trim()) return
    const data = await api.search(query, { page: targetPage, page_size: 20 })
    setResults(data.items)
    setTotal(data.total)
    setPage(targetPage)
    setSearched(true)
  }

  const handleSearch = (e) => {
    e?.preventDefault()
    runSearch(1)
  }

  const openResult = (r) => {
    const path = resultPath(r)
    if (path) navigate(path)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold gradient-text mb-6">Search</h1>
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search profiles, communities, events, posts..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-lg"
            />
          </div>
          <button type="submit" className="px-6 py-3 rounded-2xl gradient-hero text-white font-medium">Search</button>
        </form>

        {searched && (
          <>
            <div className="grid gap-3 mb-8">
              {results.map((r) => {
                const clickable = !!resultPath(r)
                return (
                  <div
                    key={`${r.entity_type}-${r.id}`}
                    onClick={() => clickable && openResult(r)}
                    className={`bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4 card-hover ${clickable ? 'cursor-pointer' : ''}`}
                  >
                    {isValidImageUrl(r.image_url) && (
                      <SafeImage src={r.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    )}
                    <div>
                      <span className="text-xs font-medium text-fuchsia-500 uppercase">{r.entity_type}</span>
                      <p className="font-medium">{r.title}</p>
                      {r.subtitle && <p className="text-sm text-slate-500">{r.subtitle}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
            <DataTable
              columns={[
                { key: 'entity_type', label: 'Type' },
                { key: 'title', label: 'Title' },
                { key: 'subtitle', label: 'Subtitle' },
              ]}
              data={results}
              serverMode
              total={total}
              page={page}
              pageSize={20}
              onPageChange={(p) => runSearch(p)}
              onRowClick={openResult}
            />
          </>
        )}
      </div>
    </div>
  )
}
