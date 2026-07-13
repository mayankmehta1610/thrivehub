import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass, TrendingUp, Users, Calendar, UserPlus, MapPin } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import SafeImage from '../components/SafeImage'
import { isValidImageUrl } from '../utils/images'

function Section({ icon: Icon, title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-violet-600" /> {title}
      </h2>
      {children}
    </section>
  )
}

export default function Explore() {
  const [config, setConfig] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {})
    api.getExplore().then(setData).catch(() => setData({ trending_posts: [], popular_communities: [], upcoming_events: [], suggested_people: [] }))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2 mb-6">
          <Compass className="w-7 h-7" /> Explore
        </h1>

        {!data ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <>
            {/* People to discover */}
            {data.suggested_people?.length > 0 && (
              <Section icon={UserPlus} title="People to discover">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {data.suggested_people.map((p) => (
                    <Link key={p.id} to={`/profile/${p.username}`}
                      className="shrink-0 w-32 bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center card-hover">
                      <SafeImage src={p.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover mx-auto bg-slate-100" />
                      <p className="mt-2 font-semibold text-sm text-slate-800 truncate">{p.display_name}</p>
                      <p className="text-xs text-slate-400 truncate">@{p.username}</p>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {/* Popular communities */}
            {data.popular_communities?.length > 0 && (
              <Section icon={Users} title="Popular communities">
                <div className="grid sm:grid-cols-2 gap-3">
                  {data.popular_communities.map((c) => (
                    <Link key={c.id} to={`/communities/${c.slug}`}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden card-hover flex">
                      {isValidImageUrl(c.cover_url)
                        ? <SafeImage src={c.cover_url} alt="" className="w-24 h-24 object-cover shrink-0" />
                        : <div className="w-24 h-24 gradient-hero shrink-0" />}
                      <div className="p-3 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{c.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                        <p className="text-xs text-violet-600 font-medium mt-1 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.member_count} members</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {/* Upcoming events */}
            {data.upcoming_events?.length > 0 && (
              <Section icon={Calendar} title="Upcoming events">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {data.upcoming_events.map((e) => (
                    <Link key={e.id} to={`/events/${e.id}`}
                      className="shrink-0 w-56 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden card-hover">
                      {isValidImageUrl(e.image_url)
                        ? <SafeImage src={e.image_url} alt="" className="w-full h-28 object-cover" />
                        : <div className="w-full h-28 gradient-hero" />}
                      <div className="p-3">
                        <p className="font-bold text-sm text-slate-800 truncate">{e.title}</p>
                        <p className="text-xs text-slate-500">{new Date(e.start_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                        {e.venue && <p className="text-xs text-slate-400 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{e.venue}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {/* Trending posts */}
            {data.trending_posts?.length > 0 && (
              <Section icon={TrendingUp} title="Trending posts">
                <div className="space-y-4">
                  {data.trending_posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
