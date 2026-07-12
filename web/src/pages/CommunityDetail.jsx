import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Users, UserPlus, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Navbar from '../components/Navbar'
import SafeImage from '../components/SafeImage'
import { isValidImageUrl } from '../utils/images'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'

export default function CommunityDetail() {
  const { slug } = useParams()
  const [config, setConfig] = useState(null)
  const [community, setCommunity] = useState(null)
  const [posts, setPosts] = useState([])
  const requireAuth = useRequireAuth()

  useEffect(() => {
    api.getConfig().then(setConfig)
    api.getCommunity(slug).then(setCommunity)
    api.getPosts({ page_size: 20 }).then((data) => setPosts(data.items))
  }, [slug])

  const [busy, setBusy] = useState(false)

  const handleJoin = async () => {
    if (!requireAuth(AUTH_MESSAGES.joinCommunity)) return
    setBusy(true)
    try {
      if (community.is_member) {
        await api.leaveCommunity(slug)
        toast.success('Left community')
      } else {
        await api.joinCommunity(slug)
        toast.success('Joined community 🎉')
      }
      const updated = await api.getCommunity(slug)
      setCommunity(updated)
    } catch (err) {
      toast.error(err?.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (!community) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-3xl mx-auto">
        {isValidImageUrl(community.cover_url) ? (
          <SafeImage src={community.cover_url} alt="" className="w-full h-56 object-cover" />
        ) : (
          <div className="w-full h-56 gradient-hero" />
        )}
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{community.name}</h1>
              <p className="text-slate-500 flex items-center gap-1 mt-1">
                <Users className="w-4 h-4" /> {community.member_count} members
              </p>
            </div>
            <button
              onClick={handleJoin}
              disabled={busy}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-medium disabled:opacity-60 ${
                community.is_member
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                  : 'gradient-hero text-white'
              }`}
            >
              {community.is_member
                ? <><Check className="w-4 h-4" /> Joined</>
                : <><UserPlus className="w-4 h-4" /> Join</>}
            </button>
          </div>
          <p className="mt-4 text-slate-600">{community.description}</p>
          <h2 className="text-lg font-bold mt-8 mb-4">Community Posts</h2>
          {posts.length === 0 ? (
            <p className="text-slate-400">No posts yet in this community.</p>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 mb-3 border border-slate-100">
                <p className="font-medium">{p.author?.display_name}</p>
                <p className="text-slate-600 mt-1">{p.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
