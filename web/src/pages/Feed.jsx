import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Send } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import SafeImage from '../components/SafeImage'
import { isValidImageUrl } from '../utils/images'
import { getUploadLimits, getFileSizeError } from '../utils/upload'

export default function Feed() {
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
  const fileInputRef = useRef(null)

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

  const handlePost = async (e) => {
    e.preventDefault()
    if (!newPost.trim()) return
    await api.createPost({ body: newPost, image_url: imageUrl || undefined })
    setNewPost('')
    setImageUrl('')
    setUploadError('')
    loadFeed()
  }

  const handleFileSelect = async (e) => {
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
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your skills, sports or adventure moment..."
            rows={3}
            className="w-full resize-none border-0 focus:outline-none text-slate-700 placeholder:text-slate-400"
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional - Unsplash/Pexels)"
            className="w-full mt-2 px-3 py-2 text-sm rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {uploadError && (
            <p className="mt-2 text-sm text-red-600">{uploadError}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 disabled:opacity-50"
              title="Upload image or video (max 500KB / 2MB)"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={postDisabled}
              className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-hero text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" /> Post
            </button>
          </div>
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
