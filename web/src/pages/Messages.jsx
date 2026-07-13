import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, Plus, Search as SearchIcon, X, Users, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import SafeImage from '../components/SafeImage'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'

export default function Messages() {
  const { user } = useAuth()
  const requireAuth = useRequireAuth()
  const [config, setConfig] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [mode, setMode] = useState('direct') // direct | group
  const [peopleQuery, setPeopleQuery] = useState('')
  const [people, setPeople] = useState([])
  const [starting, setStarting] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState([]) // [{id,title,image_url}]
  const [searchParams, setSearchParams] = useSearchParams()
  const wsRef = useRef(null)

  const conversationName = (c) => {
    if (c?.type === 'group') return c.title || `Group (${(c.participants?.length || 0) + 1})`
    return c?.participants?.[0]?.display_name || c?.title || 'Conversation'
  }

  const openNew = () => {
    setMode('direct'); setPeopleQuery(''); setPeople([]); setGroupName(''); setGroupMembers([])
    setShowNew(true)
  }

  const toggleMember = (p) => {
    setGroupMembers((prev) =>
      prev.some((m) => m.id === p.id) ? prev.filter((m) => m.id !== p.id) : [...prev, { id: p.id, title: p.title, image_url: p.image_url }]
    )
  }

  const createGroup = async () => {
    if (groupMembers.length < 2) return toast.error('Pick at least 2 people for a group')
    setStarting(true)
    try {
      const conv = await api.createConversation({
        type: 'group',
        title: groupName.trim() || 'New group',
        participant_ids: groupMembers.map((m) => m.id),
      })
      const items = await loadConversations()
      const match = items.find((c) => c.id === conv.id) || conv
      setSelected(match)
      setShowNew(false)
    } catch (err) {
      toast.error(err?.message || 'Could not create group')
    } finally {
      setStarting(false)
    }
  }

  const loadConversations = useCallback(async () => {
    const data = await api.getConversations({ page_size: 50 })
    setConversations(data.items)
    if (data.items.length && !selected) setSelected(data.items[0])
    return data.items
  }, [selected])

  const startWith = useCallback(async (userId) => {
    setStarting(true)
    try {
      const conv = await api.startConversation(userId)
      const items = await loadConversations()
      const match = items.find((c) => c.id === conv.id) || conv
      setSelected(match)
      setShowNew(false)
      setPeopleQuery('')
      setPeople([])
    } catch (err) {
      toast.error(err?.message || 'Could not start conversation')
    } finally {
      setStarting(false)
    }
  }, [loadConversations])

  const loadMessages = useCallback(async (convId) => {
    if (!convId) return
    const data = await api.getMessages(convId, { page_size: 100 })
    setMessages(data.items.reverse())
  }, [])

  useEffect(() => {
    api.getConfig().then(setConfig)
    loadConversations()
  }, [loadConversations])

  // Deep link: /messages?to=<userId> starts a conversation with that user.
  useEffect(() => {
    const to = searchParams.get('to')
    if (to) {
      searchParams.delete('to')
      setSearchParams(searchParams, { replace: true })
      startWith(to)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!showNew || peopleQuery.trim().length < 2) {
      setPeople([])
      return
    }
    let active = true
    const t = setTimeout(async () => {
      try {
        const data = await api.search(peopleQuery, { entity: 'profiles', page_size: 10 })
        if (active) setPeople((data.items || []).filter((r) => r.entity_type === 'profile'))
      } catch {
        if (active) setPeople([])
      }
    }, 300)
    return () => { active = false; clearTimeout(t) }
  }, [peopleQuery, showNew])

  useEffect(() => {
    if (selected) loadMessages(selected.id)
  }, [selected, loadMessages])

  useEffect(() => {
    if (!selected?.id || !api.token) return

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const ws = new WebSocket(api.getWsUrl(selected.id))
    wsRef.current = ws

    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'message') {
        setMessages((prev) => [...prev, data])
        loadConversations()
      }
    }

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
    }, 30000)

    return () => {
      clearInterval(ping)
      ws.close()
    }
  }, [selected?.id, loadConversations])

  const send = async (e) => {
    e.preventDefault()
    if (!requireAuth(AUTH_MESSAGES.sendMessage)) return
    if (!newMsg.trim() || !selected) return

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', body: newMsg }))
      setNewMsg('')
      return
    }

    await api.sendMessage(selected.id, newMsg)
    setNewMsg('')
    loadMessages(selected.id)
    loadConversations()
  }

  const isOwnMessage = (m) => m.sender_id === user?.id

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold gradient-text">Messages</h1>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded-full ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {wsConnected ? 'Live' : 'REST'}
            </span>
            <button
              onClick={() => { if (requireAuth(AUTH_MESSAGES.sendMessage)) openNew() }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gradient-hero text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex h-[600px] overflow-hidden">
          <div className="w-80 border-r border-slate-100 overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left p-4 border-b border-slate-50 hover:bg-violet-50/50 ${selected?.id === c.id ? 'bg-violet-50' : ''}`}
              >
                <p className="font-medium flex items-center gap-1.5">
                  {c.type === 'group' && <Users className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
                  <span className="truncate">{conversationName(c)}</span>
                </p>
                <p className="text-sm text-slate-400 truncate">{c.last_message?.body}</p>
              </button>
            ))}
            {conversations.length === 0 && <p className="p-4 text-slate-400 text-sm">No conversations yet</p>}
          </div>
          <div className="flex-1 flex flex-col">
            {selected ? (
              <>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  {selected.type === 'group' && <Users className="w-4 h-4 text-violet-500" />}
                  <span className="font-semibold text-slate-800">{conversationName(selected)}</span>
                  {selected.type === 'group' && (
                    <span className="text-xs text-slate-400">· {(selected.participants?.length || 0) + 1} people</span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${isOwnMessage(m) ? 'justify-end' : ''}`}>
                      <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                        isOwnMessage(m) ? 'gradient-hero text-white' : 'bg-slate-100'
                      }`}>
                        {!isOwnMessage(m) && <p className="text-xs font-medium opacity-70">{m.sender?.display_name}</p>}
                        {m.body}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={send} className="p-4 border-t border-slate-100 flex gap-2">
                  <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Type a message..."
                    className="flex-1 px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  <button type="submit" className="p-2 rounded-xl gradient-hero text-white"><Send className="w-5 h-5" /></button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">Select a conversation</div>
            )}
          </div>
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold">{mode === 'group' ? 'New group' : 'New message'}</h2>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-3">
                {['direct', 'group'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium capitalize ${mode === m ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500'}`}
                  >
                    {m === 'group' ? 'Group' : 'Direct'}
                  </button>
                ))}
              </div>

              {mode === 'group' && (
                <>
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name (optional)"
                    className="w-full mb-2 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  {groupMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {groupMembers.map((m) => (
                        <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-50 text-violet-700 text-xs">
                          {m.title}
                          <button onClick={() => toggleMember(m)}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  autoFocus
                  value={peopleQuery}
                  onChange={(e) => setPeopleQuery(e.target.value)}
                  placeholder="Search people by name…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <div className="mt-3 max-h-60 overflow-y-auto">
                {peopleQuery.trim().length < 2 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Type at least 2 characters to search.</p>
                ) : people.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">No people found.</p>
                ) : (
                  people.map((p) => {
                    const picked = groupMembers.some((m) => m.id === p.id)
                    return (
                      <button
                        key={p.id}
                        disabled={starting}
                        onClick={() => (mode === 'group' ? toggleMember(p) : startWith(p.id))}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-violet-50 text-left disabled:opacity-50"
                      >
                        <SafeImage src={p.image_url} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{p.title}</p>
                          <p className="text-xs text-slate-400 truncate">{p.subtitle}</p>
                        </div>
                        {mode === 'group' && (
                          <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${picked ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300'}`}>
                            {picked && <Check className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              {mode === 'group' && (
                <button
                  onClick={createGroup}
                  disabled={starting || groupMembers.length < 2}
                  className="w-full mt-3 py-2.5 rounded-xl gradient-hero text-white font-medium text-sm disabled:opacity-50"
                >
                  {starting ? 'Creating…' : `Create group${groupMembers.length ? ` (${groupMembers.length})` : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
