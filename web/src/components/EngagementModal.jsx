import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Heart, ThumbsDown, MessageCircle, Share2 } from 'lucide-react'
import api from '../api/client'
import SafeImage from './SafeImage'

const TITLES = {
  likes: 'Liked by',
  dislikes: 'Disliked by',
  comments: 'Comments',
  shares: 'Shared by',
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function UserRow({ user, subtitle, children }) {
  if (!user) return null
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
      <Link to={`/profile/${user.username}`}>
        <SafeImage
          src={user.avatar_url}
          alt=""
          className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-50"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/profile/${user.username}`} className="font-semibold text-slate-800 hover:text-violet-600">
          {user.display_name || user.username}
        </Link>
        <p className="text-xs text-slate-400">@{user.username}{subtitle ? ` · ${subtitle}` : ''}</p>
        {children}
      </div>
    </div>
  )
}

export default function EngagementModal({ postId, type, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!postId || !type) return
    setLoading(true)
    setError('')
    const load = async () => {
      try {
        let data
        if (type === 'likes') {
          data = await api.getPostReactions(postId, { type: 'like', page_size: 50 })
          setItems(data.items || [])
        } else if (type === 'dislikes') {
          data = await api.getPostReactions(postId, { type: 'dislike', page_size: 50 })
          setItems(data.items || [])
        } else if (type === 'comments') {
          data = await api.getPostCommentUsers(postId, { page_size: 50 })
          setItems(data.items || [])
        } else if (type === 'shares') {
          data = await api.getPostShares(postId, { page_size: 50 })
          setItems(data.items || [])
        }
      } catch (e) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [postId, type])

  const icons = {
    likes: <Heart className="w-5 h-5 text-pink-500" />,
    dislikes: <ThumbsDown className="w-5 h-5 text-slate-500" />,
    comments: <MessageCircle className="w-5 h-5 text-violet-500" />,
    shares: <Share2 className="w-5 h-5 text-teal-500" />,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {icons[type]}
            <h3 className="font-semibold text-slate-800">{TITLES[type]}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-50 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {loading && <p className="text-center py-8 text-slate-400">Loading...</p>}
          {error && <p className="text-center py-8 text-red-500">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="text-center py-8 text-slate-400">No one yet</p>
          )}
          {!loading && type === 'comments' && items.map((item) => (
            <UserRow key={item.id} user={item.user} subtitle={timeAgo(item.created_at)}>
              <p className="mt-1 text-sm text-slate-600 line-clamp-3">{item.body}</p>
            </UserRow>
          ))}
          {!loading && (type === 'likes' || type === 'dislikes') && items.map((item) => (
            <UserRow key={item.id} user={item.user} subtitle={timeAgo(item.created_at)} />
          ))}
          {!loading && type === 'shares' && items.map((item) => (
            <UserRow key={item.id} user={item.user} subtitle={timeAgo(item.created_at)} />
          ))}
        </div>
      </div>
    </div>
  )
}
