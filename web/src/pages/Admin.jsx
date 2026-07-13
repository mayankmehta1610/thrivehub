import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import DataTable from '../components/DataTable'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

const TABS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'masters', label: 'Master Data' },
  { id: 'users', label: 'Users' },
  { id: 'queue', label: 'Moderation Queue' },
  { id: 'appeals', label: 'Appeals' },
  { id: 'ai', label: 'AI Flags' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'audit', label: 'Audit Log' },
]

export default function Admin() {
  const { isAdmin } = useAuth()
  const [config, setConfig] = useState(null)
  const [tab, setTab] = useState('analytics')
  const [analytics, setAnalytics] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [feedbackTotal, setFeedbackTotal] = useState(0)
  const [feedbackPage, setFeedbackPage] = useState(1)
  const [masters, setMasters] = useState([])
  const [users, setUsers] = useState([])
  const [queue, setQueue] = useState([])
  const [appeals, setAppeals] = useState([])
  const [aiFlags, setAiFlags] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [masterTotal, setMasterTotal] = useState(0)
  const [userTotal, setUserTotal] = useState(0)
  const [queueTotal, setQueueTotal] = useState(0)
  const [appealTotal, setAppealTotal] = useState(0)
  const [aiTotal, setAiTotal] = useState(0)
  const [auditTotal, setAuditTotal] = useState(0)
  const [masterPage, setMasterPage] = useState(1)
  const [userPage, setUserPage] = useState(1)
  const [queuePage, setQueuePage] = useState(1)
  const [appealPage, setAppealPage] = useState(1)
  const [aiPage, setAiPage] = useState(1)
  const [auditPage, setAuditPage] = useState(1)
  const [masterType, setMasterType] = useState('skill')
  const [resolveNotes, setResolveNotes] = useState({})

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

  const loadQueue = useCallback(async () => {
    const data = await api.getModerationQueue({ page: queuePage, page_size: 20 })
    setQueue(data.items)
    setQueueTotal(data.total)
  }, [queuePage])

  const loadAppeals = useCallback(async () => {
    const data = await api.getAppeals({ page: appealPage, page_size: 20, status: 'pending' })
    setAppeals(data.items)
    setAppealTotal(data.total)
  }, [appealPage])

  const loadAiFlags = useCallback(async () => {
    const data = await api.getAiFlags({ page: aiPage, page_size: 20, status: 'pending' })
    setAiFlags(data.items)
    setAiTotal(data.total)
  }, [aiPage])

  const loadAudit = useCallback(async () => {
    const data = await api.getAuditLogs({ page: auditPage, page_size: 20 })
    setAuditLogs(data.items)
    setAuditTotal(data.total)
  }, [auditPage])

  const loadAnalytics = useCallback(async () => {
    setAnalytics(await api.getAnalytics())
  }, [])

  const loadFeedback = useCallback(async () => {
    const data = await api.getAdminFeedback({ page: feedbackPage, page_size: 20 })
    setFeedback(data.items)
    setFeedbackTotal(data.total)
  }, [feedbackPage])

  useEffect(() => {
    api.getConfig().then(setConfig)
  }, [])

  useEffect(() => {
    if (tab === 'analytics') loadAnalytics()
    if (tab === 'masters') loadMasters()
    if (tab === 'users') loadUsers()
    if (tab === 'queue') loadQueue()
    if (tab === 'appeals') loadAppeals()
    if (tab === 'ai') loadAiFlags()
    if (tab === 'feedback') loadFeedback()
    if (tab === 'audit') loadAudit()
  }, [tab, loadAnalytics, loadMasters, loadUsers, loadQueue, loadAppeals, loadAiFlags, loadFeedback, loadAudit])

  const handleResolve = async (reportId, status, action) => {
    await api.resolveReport(reportId, {
      status,
      action,
      resolution_notes: resolveNotes[reportId] || '',
    })
    loadQueue()
  }

  const handleAppeal = async (appealId, status) => {
    await api.reviewAppeal(appealId, { status, review_notes: resolveNotes[appealId] || '' })
    loadAppeals()
  }

  const handleAiReview = async (flagId, status) => {
    await api.reviewAiFlag(flagId, { status, review_notes: resolveNotes[flagId] || '' })
    loadAiFlags()
  }

  if (!isAdmin) return <Navigate to="/feed" />

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold gradient-text">Admin Portal</h1>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id ? 'gradient-hero text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'analytics' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Platform Analytics</h2>
            {!analytics ? (
              <p className="text-slate-400">Loading…</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                  {[
                    ['Users', analytics.totals.users, analytics.new_last_7_days.users],
                    ['Posts', analytics.totals.posts, analytics.new_last_7_days.posts],
                    ['Comments', analytics.totals.comments, analytics.new_last_7_days.comments],
                    ['Reactions', analytics.totals.reactions, null],
                    ['Communities', analytics.totals.communities, null],
                    ['Events', analytics.totals.events, analytics.new_last_7_days.events],
                    ['Event sign-ups', analytics.totals.event_registrations, null],
                    ['Messages', analytics.totals.messages, null],
                    ['Open reports', analytics.totals.reports_open, null],
                    ['Active subs', analytics.totals.subscriptions_active, null],
                  ].map(([label, value, delta]) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                      <p className="text-2xl font-bold gradient-text">{value}</p>
                      <p className="text-sm text-slate-500">{label}</p>
                      {delta != null && <p className="text-xs text-emerald-600 mt-0.5">+{delta} this week</p>}
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 inline-block">
                  <span className="text-sm text-slate-500">Avg engagement / post: </span>
                  <span className="font-bold text-slate-800">{analytics.engagement_per_post}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="font-bold mb-3">Top communities</h3>
                    {analytics.top_communities.map((c) => (
                      <div key={c.name} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-slate-700 truncate">{c.name}</span>
                        <span className="text-slate-500 font-medium">{c.members}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="font-bold mb-3">Top events</h3>
                    {analytics.top_events.map((e) => (
                      <div key={e.title} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-slate-700 truncate">{e.title}</span>
                        <span className="text-slate-500 font-medium">{e.registrations}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'feedback' && (
          <div>
            <h2 className="text-lg font-bold mb-4">User Feedback</h2>
            <DataTable
              columns={[
                { key: 'category', label: 'Type' },
                { key: 'message', label: 'Message' },
                { key: 'rating', label: 'Rating', render: (r) => (r.rating ? `${r.rating}★` : '—') },
                { key: 'user', label: 'From', render: (r) => r.user?.display_name || 'Anonymous' },
                { key: 'created_at', label: 'When', render: (r) => new Date(r.created_at).toLocaleDateString() },
              ]}
              data={feedback}
              serverMode
              total={feedbackTotal}
              page={feedbackPage}
              pageSize={20}
              onPageChange={setFeedbackPage}
            />
          </div>
        )}

        {tab === 'masters' && (
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
        )}

        {tab === 'users' && (
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
        )}

        {tab === 'queue' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Moderation Queue</h2>
            <DataTable
              columns={[
                { key: 'target_type', label: 'Type' },
                { key: 'target_id', label: 'Target ID', render: (r) => r.target_id?.slice(0, 8) + '…' },
                { key: 'status', label: 'Status' },
                { key: 'priority', label: 'Priority' },
                { key: 'description', label: 'Description' },
                { key: 'created_at', label: 'Reported', render: (r) => new Date(r.created_at).toLocaleDateString() },
                {
                  key: 'actions', label: 'Actions',
                  render: (r) => (
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => handleResolve(r.id, 'resolved', 'hide')}
                        className="px-2 py-1 text-xs rounded-lg bg-red-100 text-red-700">Hide</button>
                      <button onClick={() => handleResolve(r.id, 'dismissed', null)}
                        className="px-2 py-1 text-xs rounded-lg bg-slate-100 text-slate-700">Dismiss</button>
                    </div>
                  ),
                },
              ]}
              data={queue}
              serverMode
              total={queueTotal}
              page={queuePage}
              pageSize={20}
              onPageChange={setQueuePage}
            />
          </div>
        )}

        {tab === 'appeals' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Pending Appeals</h2>
            <DataTable
              columns={[
                { key: 'reason', label: 'Reason' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Filed', render: (r) => new Date(r.created_at).toLocaleDateString() },
                {
                  key: 'actions', label: 'Review',
                  render: (r) => (
                    <div className="flex gap-1">
                      <button onClick={() => handleAppeal(r.id, 'approved')}
                        className="px-2 py-1 text-xs rounded-lg bg-green-100 text-green-700">Approve</button>
                      <button onClick={() => handleAppeal(r.id, 'rejected')}
                        className="px-2 py-1 text-xs rounded-lg bg-red-100 text-red-700">Reject</button>
                    </div>
                  ),
                },
              ]}
              data={appeals}
              serverMode
              total={appealTotal}
              page={appealPage}
              pageSize={20}
              onPageChange={setAppealPage}
            />
          </div>
        )}

        {tab === 'ai' && (
          <div>
            <h2 className="text-lg font-bold mb-4">AI Moderation Flags</h2>
            <DataTable
              columns={[
                { key: 'target_type', label: 'Type' },
                { key: 'target_id', label: 'Target', render: (r) => r.target_id?.slice(0, 8) + '…' },
                { key: 'confidence', label: 'Confidence', render: (r) => `${r.confidence}%` },
                { key: 'flagged_by', label: 'Source' },
                { key: 'status', label: 'Status' },
                {
                  key: 'actions', label: 'Review',
                  render: (r) => (
                    <div className="flex gap-1">
                      <button onClick={() => handleAiReview(r.id, 'reviewed')}
                        className="px-2 py-1 text-xs rounded-lg bg-red-100 text-red-700">Action</button>
                      <button onClick={() => handleAiReview(r.id, 'dismissed')}
                        className="px-2 py-1 text-xs rounded-lg bg-slate-100 text-slate-700">Dismiss</button>
                    </div>
                  ),
                },
              ]}
              data={aiFlags}
              serverMode
              total={aiTotal}
              page={aiPage}
              pageSize={20}
              onPageChange={setAiPage}
            />
          </div>
        )}

        {tab === 'audit' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Audit Log</h2>
            <DataTable
              columns={[
                { key: 'action', label: 'Action' },
                { key: 'entity_type', label: 'Entity' },
                { key: 'entity_id', label: 'Entity ID', render: (r) => r.entity_id?.slice(0, 8) || '—' },
                { key: 'actor', label: 'Actor', render: (r) => r.actor?.display_name || r.actor_id?.slice(0, 8) },
                { key: 'ip_address', label: 'IP' },
                { key: 'created_at', label: 'When', render: (r) => new Date(r.created_at).toLocaleString() },
              ]}
              data={auditLogs}
              serverMode
              total={auditTotal}
              page={auditPage}
              pageSize={20}
              onPageChange={setAuditPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
