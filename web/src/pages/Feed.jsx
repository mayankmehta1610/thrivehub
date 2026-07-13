import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Image, Send } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import SafeImage from '../components/SafeImage'
import RichTextEditor from '../components/RichTextEditor'
import { isValidImageUrl, isVideoUrl, isAudioUrl } from '../utils/images'
import { SOCIAL_META } from '../utils/social'
import { getUploadLimits, getFileSizeError } from '../utils/upload'
import { useAuth } from '../context/AuthContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'

export default function Feed() {
  const requireAuth = useRequireAuth()
  const { user } = useAuth()
  const [config, setConfig] = useState(null)
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sponsors, setSponsors] = useState([])
  const [connections, setConnections] = useState([])
  const [crossPost, setCrossPost] = useState([])
  const fileInputRef = useRef(null)

  const connectedProviders = connections.filter((c) => c.connected)

  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getFeed({ page, page_size: 10 })
      setPosts(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    api.getConfig().then(setConfig)
    api.getSponsorships({ placement: 'feed_banner', page_size: 3 }).then((d) => setSponsors(d.items || []))
    loadFeed()
  }, [loadFeed])

  useEffect(() => {
    if (user) api.getSocialConnections().then(setConnections).catch(() => setConnections([]))
    else setConnections([])
  }, [user])

  const toggleCrossPost = (provider) => {
    setCrossPost((prev) => (prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]))
  }

  const handlePost = async (e) => {
    e.preventDefault()
    if (!requireAuth(AUTH_MESSAGES.createPost)) return
    if (!newPost.trim()) return
    await api.createPost({ body: newPost, image_url: imageUrl || undefined, cross_post: crossPost })
    setNewPost('')
    setImageUrl('')
    setUploadError('')
    setCrossPost([])
    loadFeed()
  }

  const handleFileSelect = async (e) => {
    if (!requireAuth(AUTH_MESSAGES.uploadMedia)) {
      e.target.value = ''
      return
    }
    const file = e.target.files?.[0]
    if (!file) return
    const limits = getUploadLimits(config)
    const sizeError = getFileSizeError(file, limits)
    if (sizeError) {
      setUploadError(sizeError)
      e.target.value = ''
      return
    }
    setUploadError('')
    setUploading(true)
    try {
      const result = await api.uploadMedia(file, limits)
      setImageUrl(result.url)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const postDisabled = uploading || (!newPost.trim() && !imageUrl)

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {sponsors.length > 0 && isValidImageUrl(sponsors[0].image_url) && (
          <a href={sponsors[0].link_url || '#'} target="_blank" rel="noopener noreferrer"
            className="block rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <SafeImage src={sponsors[0].image_url} alt={sponsors[0].title} className="w-full h-32 object-cover" />
            <div className="px-4 py-2 bg-white text-xs text-slate-400">Sponsored · {sponsors[0].sponsor_name}</div>
          </a>
        )}
        <form onSubmit={handlePost} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <RichTextEditor
            value={newPost}
            onChange={setNewPost}
            placeholder="Share your skills, sports or adventure moment…"
            rows={3}
          />
          {imageUrl && (
            <div className="mt-2 rounded-xl overflow-hidden border border-slate-100">
              {isAudioUrl(imageUrl)
                ? <audio src={imageUrl} controls className="w-full" />
                : isVideoUrl(imageUrl)
                  ? <video src={imageUrl} controls className="w-full max-h-64 bg-black" />
                  : <SafeImage src={imageUrl} alt="" className="w-full max-h-64 object-cover" />}
            </div>
          )}
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="…or paste an image/video URL"
            className="w-full mt-2 px-3 py-2 text-sm rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          {uploadError && (
            <p className="mt-2 text-sm text-red-600">{uploadError}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Cross-post to connected social channels */}
          {connectedProviders.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Also post to:</span>
              {connectedProviders.map((c) => {
                const meta = SOCIAL_META[c.provider]
                if (!meta) return null
                const on = crossPost.includes(c.provider)
                return (
                  <button
                    key={c.provider}
                    type="button"
                    onClick={() => toggleCrossPost(c.provider)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      on ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span aria-hidden="true">{meta.emoji}</span> {meta.label}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                if (!requireAuth(AUTH_MESSAGES.uploadMedia)) return
                fileInputRef.current?.click()
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
              title="Upload a photo, video or audio file (500 KB image / 2 MB video / 5 MB audio)"
            >
              <Image className="w-5 h-5" /> {uploading ? 'Uploading…' : 'Photo / Video / Audio'}
            </button>
            <button
              type="submit"
              disabled={postDisabled}
              className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-hero text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" /> Post
            </button>
          </div>
          {user && connectedProviders.length === 0 && (
            <p className="mt-2 text-xs text-slate-400">
              Want to share to YouTube, Instagram, X or Facebook?{' '}
              <Link to={`/profile/${user.profile?.username}`} className="text-violet-600 hover:underline">Connect accounts</Link> in your profile settings.
            </p>
          )}
        </form>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading feed...</div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} onUpdate={loadFeed} />)
        )}

        {total > 10 && (
          <div className="flex justify-center gap-2 py-4">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Previous</button>
            <span className="px-4 py-2 text-sm text-slate-500">Page {page}</span>
            <button disabled={page * 10 >= total} onClick={() => setPage(page + 1)}
              className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
