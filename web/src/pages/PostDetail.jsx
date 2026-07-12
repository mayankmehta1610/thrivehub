import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [post, setPost] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const load = () => {
    api.getPost(id).then(setPost).catch(() => setNotFound(true))
  }

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {})
    setPost(null)
    setNotFound(false)
    api.getPost(id).then(setPost).catch(() => setNotFound(true))
  }, [id])

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar config={config} />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="text-slate-500 text-lg">This post could not be found.</p>
          <Link to="/feed" className="inline-block mt-4 font-semibold text-fuchsia-600 hover:underline">← Back to feed</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 mb-4 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {post ? (
          <PostCard post={post} onUpdate={load} linkToDetail={false} defaultOpenComments />
        ) : (
          <div className="text-center py-16 text-slate-400">Loading post…</div>
        )}
      </div>
    </div>
  )
}
