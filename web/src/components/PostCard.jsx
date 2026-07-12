import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ThumbsDown, MessageCircle, Share2, MoreHorizontal, MessageSquareOff } from 'lucide-react'
import api from '../api/client'
import SafeImage from './SafeImage'
import CommentSection from './CommentSection'
import EngagementModal from './EngagementModal'
import { useAuth } from '../context/AuthContext'
import { isValidImageUrl } from '../utils/images'

export default function PostCard({ post, onUpdate, isOwn = false }) {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [engagementModal, setEngagementModal] = useState(null)
  const [localPost, setLocalPost] = useState(post)
  const [shareToast, setShareToast] = useState('')
  const [togglingComments, setTogglingComments] = useState(false)

  useEffect(() => {
    setLocalPost(post)
  }, [post])

  const p = localPost

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const refreshPost = async () => {
    try {
      const updated = await api.getPost(p.id)
      setLocalPost(updated)
      onUpdate?.()
    } catch {
      onUpdate?.()
    }
  }

  const toggleReaction = async (reactionType) => {
    if (!user) return
    try {
      const isSame = p.user_reaction_type === reactionType
      if (isSame) {
        await api.unreactPost(p.id)
        setLocalPost((prev) => ({
          ...prev,
          user_reaction_type: null,
          user_reacted: false,
          like_count: reactionType === 'like' ? Math.max(0, prev.like_count - 1) : prev.like_count,
          dislike_count: reactionType === 'dislike' ? Math.max(0, prev.dislike_count - 1) : prev.dislike_count,
        }))
      } else {
        const wasOther = p.user_reaction_type && p.user_reaction_type !== reactionType
        await api.reactPost(p.id, reactionType)
        setLocalPost((prev) => {
          const next = { ...prev, user_reaction_type: reactionType, user_reacted: true }
          if (reactionType === 'like') {
            next.like_count = prev.like_count + 1
            if (wasOther) next.dislike_count = Math.max(0, prev.dislike_count - 1)
          } else {
            next.dislike_count = prev.dislike_count + 1
            if (wasOther) next.like_count = Math.max(0, prev.like_count - 1)
          }
          return next
        })
      }
    } catch (e) {
      console.error(e)
      refreshPost()
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/feed?post=${p.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ThriveHub Post', url, text: p.body?.slice(0, 100) })
      } else {
        await navigator.clipboard.writeText(url)
        setShareToast('Link copied!')
        setTimeout(() => setShareToast(''), 2000)
      }
      if (user) {
        await api.sharePost(p.id)
        setLocalPost((prev) => ({ ...prev, share_count: (prev.share_count || 0) + 1 }))
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url)
          setShareToast('Link copied!')
          setTimeout(() => setShareToast(''), 2000)
        } catch {
          console.error(e)
        }
      }
    }
  }

  const toggleCommentsEnabled = async () => {
    setTogglingComments(true)
    try {
      const updated = await api.updatePost(p.id, { comments_enabled: !p.comments_enabled })
      setLocalPost(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setTogglingComments(false)
    }
  }

  const CountButton = ({ count, onClick, children, className = '' }) => (
    <button
      onClick={onClick}
      disabled={!count}
      className={`flex items-center gap-1.5 text-sm font-medium transition-colors disabled:cursor-default ${className} ${count ? 'hover:underline cursor-pointer' : ''}`}
    >
      {children}
      <span>{count || 0}</span>
    </button>
  )

  return (
    <>
      <article className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden card-hover">
        <div className="p-4 flex items-center gap-3">
          <Link to={`/profile/${p.author?.username}`}>
            <SafeImage
              src={p.author?.avatar_url}
              alt=""
              className="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-100"
            />
          </Link>
          <div className="flex-1">
            <Link to={`/profile/${p.author?.username}`} className="font-semibold text-slate-800 hover:text-indigo-600">
              {p.author?.display_name}
            </Link>
            <p className="text-xs text-slate-400">
              @{p.author?.username} · {timeAgo(p.created_at)}
              {!p.comments_enabled && <span className="ml-1 text-slate-300">· comments off</span>}
            </p>
          </div>
          {isOwn && (
            <button
              onClick={toggleCommentsEnabled}
              disabled={togglingComments}
              title={p.comments_enabled ? 'Disable comments' : 'Enable comments'}
              className="p-2 rounded-lg hover:bg-slate-50 text-slate-400"
            >
              <MessageSquareOff className={`w-5 h-5 ${p.comments_enabled ? '' : 'text-amber-500'}`} />
            </button>
          )}
          <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-400">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{p.body}</p>
        </div>

        {isValidImageUrl(p.image_url) && (
          <SafeImage src={p.image_url} alt="" className="w-full max-h-96 object-cover" hideOnError />
        )}

        <div className="px-4 py-3 flex items-center gap-4 sm:gap-6 border-t border-slate-50 flex-wrap">
          <button
            onClick={() => toggleReaction('like')}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              p.user_reaction_type === 'like' ? 'text-pink-500' : 'text-slate-500 hover:text-pink-500'
            }`}
          >
            <Heart className={`w-5 h-5 ${p.user_reaction_type === 'like' ? 'fill-current' : ''}`} />
          </button>
          <CountButton
            count={p.like_count}
            onClick={() => p.like_count > 0 && setEngagementModal('likes')}
            className="text-slate-500 hover:text-pink-500 -ml-3"
          >
            <span className="sr-only">Likes</span>
          </CountButton>

          <button
            onClick={() => toggleReaction('dislike')}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              p.user_reaction_type === 'dislike' ? 'text-slate-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ThumbsDown className={`w-5 h-5 ${p.user_reaction_type === 'dislike' ? 'fill-current' : ''}`} />
          </button>
          <CountButton
            count={p.dislike_count}
            onClick={() => p.dislike_count > 0 && setEngagementModal('dislikes')}
            className="text-slate-500 hover:text-slate-700 -ml-3"
          >
            <span className="sr-only">Dislikes</span>
          </CountButton>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-500"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <CountButton
            count={p.comment_count}
            onClick={() => {
              if (p.comment_count > 0) setEngagementModal('comments')
              else setShowComments(true)
            }}
            className="text-slate-500 hover:text-indigo-500 -ml-3"
          >
            <span className="sr-only">Comments</span>
          </CountButton>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-500"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <CountButton
            count={p.share_count}
            onClick={() => p.share_count > 0 && setEngagementModal('shares')}
            className="text-slate-500 hover:text-teal-500 -ml-3"
          >
            <span className="sr-only">Shares</span>
          </CountButton>

          {shareToast && <span className="text-xs text-teal-600 ml-auto">{shareToast}</span>}
        </div>

        {showComments && (
          <CommentSection
            postId={p.id}
            commentsEnabled={p.comments_enabled !== false}
            onCommentAdded={() => {
              setLocalPost((prev) => ({ ...prev, comment_count: (prev.comment_count || 0) + 1 }))
              onUpdate?.()
            }}
          />
        )}
      </article>

      {engagementModal && (
        <EngagementModal
          postId={p.id}
          type={engagementModal}
          onClose={() => setEngagementModal(null)}
        />
      )}
    </>
  )
}
