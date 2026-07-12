import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Users, UserPlus } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'

export default function CommunityDetail() {
  const { slug } = useParams()
  const [config, setConfig] = useState(null)
  const [community, setCommunity] = useState(null)
  const [posts, setPosts] = useState([])

  useEffect(() => {
    api.getConfig().then(setConfig)
    api.getCommunity(slug).then(setCommunity)
    api.getPosts({ page_size: 20 }).then((data) => setPosts(data.items))
  }, [slug])

  const handleJoin = async () => {
    await api.joinCommunity(slug)
    const updated = await api.getCommunity(slug)
    setCommunity(updated)
  }

  if (!community) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-3xl mx-auto">
        <img src={community.cover_url} alt="" className="w-full h-56 object-cover" />
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{community.name}</h1>
              <p className="text-slate-500 flex items-center gap-1 mt-1">
                <Users className="w-4 h-4" /> {community.member_count} members
              </p>
            </div>
            <button onClick={handleJoin} className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-hero text-white font-medium">
              <UserPlus className="w-4 h-4" /> Join
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
