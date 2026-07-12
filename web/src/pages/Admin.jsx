import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import DataTable from '../components/DataTable'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

export default function Admin() {
  const { isAdmin } = useAuth()
  const [config, setConfig] = useState(null)
  const [masters, setMasters] = useState([])
  const [users, setUsers] = useState([])
  const [masterTotal, setMasterTotal] = useState(0)
  const [userTotal, setUserTotal] = useState(0)
  const [masterPage, setMasterPage] = useState(1)
  const [userPage, setUserPage] = useState(1)
  const [masterType, setMasterType] = useState('skill')

  const loadMasters = useCallback(async () => {
    const data = await api.getAdminMasters({ page: masterPage, page_size: 20, master_type: masterType })
    setMasters(data.items)
    setMasterTotal(data.total)
  }, [masterPage, masterType])

  const loadUsers = useCallback(async () => {
    const data = await api.getUsers({ page: userPage, page_size: 20 })
    setUsers(data.items)
    setUserTotal(data.total)
  }, [userPage])

  useEffect(() => {
    api.getConfig().then(setConfig)
    loadMasters()
    loadUsers()
  }, [loadMasters, loadUsers])

  if (!isAdmin) return <Navigate to="/feed" />

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <h1 className="text-2xl font-bold gradient-text">Admin Portal</h1>

        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-bold">Master Data</h2>
            <select value={masterType} onChange={(e) => { setMasterType(e.target.value); setMasterPage(1) }}
              className="px-3 py-1.5 rounded-xl border text-sm">
              {['skill', 'sport', 'adventure', 'event_type', 'community_category', 'reaction', 'report_reason', 'feature'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <DataTable
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'label', label: 'Label' },
              { key: 'description', label: 'Description' },
              { key: 'status', label: 'Status' },
              { key: 'sort_order', label: 'Order' },
            ]}
            data={masters}
            serverMode
            total={masterTotal}
            page={masterPage}
            pageSize={20}
            onPageChange={setMasterPage}
          />
        </div>

        <div>
          <h2 className="text-lg font-bold mb-4">Users</h2>
          <DataTable
            columns={[
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
              { key: 'status', label: 'Status' },
              { key: 'created_at', label: 'Joined', render: (r) => new Date(r.created_at).toLocaleDateString() },
              { key: 'profile', label: 'Username', render: (r) => r.profile?.username },
            ]}
            data={users}
            serverMode
            total={userTotal}
            page={userPage}
            pageSize={20}
            onPageChange={setUserPage}
          />
        </div>
      </div>
    </div>
  )
}
