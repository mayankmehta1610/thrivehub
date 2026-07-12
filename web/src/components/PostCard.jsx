import { useEffect, useState } from 'react'
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react'
import api from '../api/client'

export default function PostCard({ post, onUpdate }) {
  const [comments, setComments] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleReaction = async () => {
    try {
      if (post.user_reacted) {
        await api.unreactPost(post.id)
      } else {
        await api.reactPost(post.id)
      }
      onUpdate?.()
    } catch (e) {
      console.error(e)
    }
  }

  const loadComments = async () => {
    const data = await api.getPostComments(post.id, { page_size: 20 })
    setComments(data.items)
  }

  const handleShowComments = async () => {
    if (!showComments) await loadComments()
    setShowComments(!showComments)
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setLoading(true)
    try {
      await api.createComment(post.id, newComment)
      setNewComment('')
      await loadComments()
      onUpdate?.()
    } finally {
      setLoading(false)
    }
  }

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden card-hover">
      <div className="p-4 flex items-center gap-3">
        <img
          src={post.author?.avatar_url}
          alt=""
          className="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-100"
        />
        <div className="flex-1">
          <h4 className="font-semibold text-slate-800">{post.author?.display_name}</h4>
          <p className="text-xs text-slate-400">@{post.author?.username} · {timeAgo(post.created_at)}</p>
        </div>
        <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-400">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 pb-3">
        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{post.body}</p>
      </div>

      {post.image_url && (
        <img src={post.image_url} alt="" className="w-full max-h-96 object-cover" />
      )}

      <div className="px-4 py-3 flex items-center gap-6 border-t border-slate-50">
        <button
          onClick={toggleReaction}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            post.user_reacted ? 'text-pink-500' : 'text-slate-500 hover:text-pink-500'
          }`}
        >
          <Heart className={`w-5 h-5 ${post.user_reacted ? 'fill-current' : ''}`} />
          {post.reaction_count}
        </button>
        <button
          onClick={handleShowComments}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-500"
        >
          <MessageCircle className="w-5 h-5" />
          {post.comment_count}
        </button>
        <button className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-500">
          <Share2 className="w-5 h-5" />
          Share
        </button>
      </div>

      {showComments && (
        <div className="px-4 pb-4 border-t border-slate-50 bg-slate-50/50">
          <form onSubmit={submitComment} className="flex gap-2 py-3">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl gradient-hero text-white text-sm font-medium disabled:opacity-50"
            >
              Post
            </button>
          </form>
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 py-2">
              <img src={c.author?.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              <div className="bg-white rounded-xl px-3 py-2 flex-1">
                <p className="text-sm font-medium">{c.author?.display_name}</p>
                <p className="text-sm text-slate-600">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
