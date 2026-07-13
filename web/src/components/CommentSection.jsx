import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import SafeImage from './SafeImage'
import RichText from './RichText'
import RichTextEditor from './RichTextEditor'
import { useAuth } from '../context/AuthContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'

const MIN_LENGTH = 1
const MAX_LENGTH = 2000

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatTimestamp(date) {
  return new Date(date).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function CommentSection({ postId, commentsEnabled = true, onCommentAdded }) {
  const { user } = useAuth()
  const requireAuth = useRequireAuth()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingComments, setLoadingComments] = useState(true)
  const [error, setError] = useState('')

  const loadComments = async () => {
    setLoadingComments(true)
    try {
      const data = await api.getPostComments(postId, { page_size: 50 })
      setComments(data.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingComments(false)
    }
  }

  useEffect(() => {
    loadComments()
  }, [postId])

  const validateComment = (text) => {
    const trimmed = text.trim()
    if (trimmed.length < MIN_LENGTH) return 'Comment cannot be empty'
    if (trimmed.length > MAX_LENGTH) return `Comment must be at most ${MAX_LENGTH} characters`
    return null
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!requireAuth(AUTH_MESSAGES.comment)) return
    const validationError = validateComment(newComment)
    if (validationError) {
      setError(validationError)
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.createComment(postId, newComment.trim())
      setNewComment('')
      await loadComments()
      onCommentAdded?.()
    } catch (e) {
      setError(e.message || 'Failed to post comment')
    } finally {
      setLoading(false)
    }
  }

  if (!commentsEnabled) {
    return (
      <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/50">
        <p className="text-sm text-slate-400 text-center py-2">Comments are turned off for this post</p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-4 border-t border-slate-50 bg-slate-50/50">
      {user ? (
        <form onSubmit={submitComment} className="py-3 space-y-2">
          <RichTextEditor
            value={newComment}
            onChange={(v) => { setNewComment(v.slice(0, MAX_LENGTH)); setError('') }}
            placeholder="Write a comment…"
            rows={2}
          />
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            {error ? <span className="text-red-500">{error}</span> : <span>{newComment.trim().length}/{MAX_LENGTH}</span>}
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="px-4 py-1.5 rounded-xl gradient-hero text-white text-sm font-medium disabled:opacity-50"
            >
              {loading ? '…' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <div className="py-3 text-center">
          <button
            type="button"
            onClick={() => requireAuth(AUTH_MESSAGES.comment)}
            className="text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            Sign in to comment
          </button>
        </div>
      )}

      {loadingComments ? (
        <p className="text-sm text-slate-400 text-center py-4">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <article key={c.id} className="flex gap-3 bg-white rounded-xl p-3 shadow-sm border border-slate-100">
              <Link to={`/profile/${c.author?.username}`}>
                <SafeImage
                  src={c.author?.avatar_url}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-violet-50 shrink-0"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <Link
                    to={`/profile/${c.author?.username}`}
                    className="text-sm font-semibold text-slate-800 hover:text-violet-600"
                  >
                    {c.author?.display_name || c.author?.username}
                  </Link>
                  <span className="text-xs text-slate-400">@{c.author?.username}</span>
                  <time className="text-xs text-slate-400" title={formatTimestamp(c.created_at)}>
                    · {timeAgo(c.created_at)}
                  </time>
                </div>
                <div className="mt-1 text-sm text-slate-700 break-words">
                  <RichText text={c.body} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
