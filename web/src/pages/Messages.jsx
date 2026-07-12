import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, Plus, Search as SearchIcon, X } from 'lucide-react'
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
  const [peopleQuery, setPeopleQuery] = useState('')
  const [people, setPeople] = useState([])
  const [starting, setStarting] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const wsRef = useRef(null)

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
              onClick={() => { if (requireAuth(AUTH_MESSAGES.sendMessage)) setShowNew(true) }}
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
                <p className="font-medium">{c.participants[0]?.display_name || c.title || 'Conversation'}</p>
                <p className="text-sm text-slate-400 truncate">{c.last_message?.body}</p>
              </button>
            ))}
            {conversations.length === 0 && <p className="p-4 text-slate-400 text-sm">No conversations yet</p>}
          </div>
          <div className="flex-1 flex flex-col">
            {selected ? (
              <>
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
              <h2 className="text-lg font-bold">New message</h2>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  autoFocus
                  value={peopleQuery}
                  onChange={(e) => setPeopleQuery(e.target.value)}
                  placeholder="Search people by name…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                />
              </div>
              <div className="mt-3 max-h-72 overflow-y-auto">
                {peopleQuery.trim().length < 2 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Type at least 2 characters to search.</p>
                ) : people.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">No people found.</p>
                ) : (
                  people.map((p) => (
                    <button
                      key={p.id}
                      disabled={starting}
                      onClick={() => startWith(p.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-fuchsia-50 text-left disabled:opacity-50"
                    >
                      <SafeImage src={p.image_url} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                      <div>
                        <p className="font-medium text-slate-800">{p.title}</p>
                        <p className="text-xs text-slate-400">{p.subtitle}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
