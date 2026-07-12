import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'

export default function DataTable({
  columns,
  data = [],
  serverMode = false,
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  onSortChange,
  onSearchChange,
  sortBy,
  sortOrder = 'desc',
  searchPlaceholder = 'Search...',
}) {
  const [clientSearch, setClientSearch] = useState('')
  const [clientSort, setClientSort] = useState({ key: sortBy || columns[0]?.key, order: sortOrder })
  const [clientPage, setClientPage] = useState(1)

  const filtered = useMemo(() => {
    if (serverMode) return data
    let rows = [...data]
    if (clientSearch) {
      const term = clientSearch.toLowerCase()
      rows = rows.filter((row) =>
        columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(term))
      )
    }
    if (clientSort.key) {
      rows.sort((a, b) => {
        const av = a[clientSort.key] ?? ''
        const bv = b[clientSort.key] ?? ''
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
        return clientSort.order === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [data, clientSearch, clientSort, columns, serverMode])

  const effectiveTotal = serverMode ? total : filtered.length
  const effectivePage = serverMode ? page : clientPage
  const effectivePageSize = pageSize
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / effectivePageSize))
  const start = (effectivePage - 1) * effectivePageSize

  const pageData = serverMode
    ? data
    : filtered.slice(start, start + effectivePageSize)

  const handleSort = (key) => {
    const newOrder = (serverMode ? sortBy : clientSort.key) === key && (serverMode ? sortOrder : clientSort.order) === 'asc' ? 'desc' : 'asc'
    if (serverMode) {
      onSortChange?.(key, newOrder)
    } else {
      setClientSort({ key, order: newOrder })
      setClientPage(1)
    }
  }

  const handleSearch = (val) => {
    if (serverMode) {
      onSearchChange?.(val)
    } else {
      setClientSearch(val)
      setClientPage(1)
    }
  }

  const handlePage = (p) => {
    if (serverMode) {
      onPageChange?.(p)
    } else {
      setClientPage(p)
    }
  }

  const currentSortKey = serverMode ? sortBy : clientSort.key
  const currentSortOrder = serverMode ? sortOrder : clientSort.order

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-slate-500">{effectiveTotal} results</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-indigo-600"
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {currentSortKey === col.key && (
                      currentSortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">
                  No data found
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => (
                <tr key={row.id || i} className="border-t border-slate-50 hover:bg-indigo-50/30">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-sm text-slate-500">
          Page {effectivePage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={effectivePage <= 1}
            onClick={() => handlePage(effectivePage - 1)}
            className="px-3 py-1 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            Previous
          </button>
          <button
            disabled={effectivePage >= totalPages}
            onClick={() => handlePage(effectivePage + 1)}
            className="px-3 py-1 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
