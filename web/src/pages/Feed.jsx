import { useCallback, useEffect, useState } from 'react'
import { Image, Send } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'

export default function Feed() {
  const [config, setConfig] = useState(null)
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [imageUrl, setImageUrl] = useState('')

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
    loadFeed()
  }, [loadFeed])

  const handlePost = async (e) => {
    e.preventDefault()
    if (!newPost.trim()) return
    await api.createPost({ body: newPost, image_url: imageUrl || undefined })
    setNewPost('')
    setImageUrl('')
    loadFeed()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
            <button type="button" className="p-2 rounded-xl text-slate-400 hover:bg-slate-50">
              <Image className="w-5 h-5" />
            </button>
            <button type="submit" className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-hero text-white font-medium text-sm">
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
