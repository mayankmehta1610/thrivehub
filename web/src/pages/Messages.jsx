import { useCallback, useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'

export default function Messages() {
  const [config, setConfig] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')

  const loadConversations = useCallback(async () => {
    const data = await api.getConversations({ page_size: 50 })
    setConversations(data.items)
    if (data.items.length && !selected) setSelected(data.items[0])
  }, [selected])

  const loadMessages = useCallback(async (convId) => {
    if (!convId) return
    const data = await api.getMessages(convId, { page_size: 100 })
    setMessages(data.items.reverse())
  }, [])

  useEffect(() => {
    api.getConfig().then(setConfig)
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (selected) loadMessages(selected.id)
  }, [selected, loadMessages])

  const send = async (e) => {
    e.preventDefault()
    if (!newMsg.trim() || !selected) return
    await api.sendMessage(selected.id, newMsg)
    setNewMsg('')
    loadMessages(selected.id)
    loadConversations()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold gradient-text mb-6">Messages</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex h-[600px] overflow-hidden">
          <div className="w-80 border-r border-slate-100 overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left p-4 border-b border-slate-50 hover:bg-indigo-50/50 ${selected?.id === c.id ? 'bg-indigo-50' : ''}`}
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
                    <div key={m.id} className={`flex ${m.sender_id === selected.participants[0]?.id ? '' : 'justify-end'}`}>
                      <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                        m.sender?.display_name ? 'bg-slate-100' : 'gradient-hero text-white'
                      }`}>
                        <p className="text-xs font-medium opacity-70">{m.sender?.display_name}</p>
                        {m.body}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={send} className="p-4 border-t border-slate-100 flex gap-2">
                  <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Type a message..."
                    className="flex-1 px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <button type="submit" className="p-2 rounded-xl gradient-hero text-white"><Send className="w-5 h-5" /></button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">Select a conversation</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
