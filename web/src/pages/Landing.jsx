import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Users, Calendar, MessageCircle, Trophy,
  Sparkles, MapPin, Heart, ChevronLeft, ChevronRight,
} from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'

function Carousel({ children, className = '' }) {
  const scroll = (dir) => {
    const el = document.getElementById('landing-carousel')
    if (el) el.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }
  return (
    <div className={`relative group ${className}`}>
      <button
        type="button"
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -ml-3"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 text-indigo-600" />
      </button>
      <div id="landing-carousel" className="flex gap-5 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory scrollbar-hide">
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -mr-3"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 text-indigo-600" />
      </button>
    </div>
  )
}

function formatEventDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Landing() {
  const [config, setConfig] = useState(null)

  useEffect(() => {
    api.getConfig().then(setConfig).catch(console.error)
  }, [])

  const features = config?.features || []
  const categories = config?.skill_categories || []
  const communities = config?.featured_communities || []
  const events = config?.featured_events || []
  const posts = config?.featured_posts || []
  const sponsors = config?.sponsorships || []
  const stats = config?.stats || {}
  const icons = [Trophy, Users, Calendar, MessageCircle]

  const cssVars = config ? {
    '--primary': config.primary_color,
    '--secondary': config.secondary_color,
    '--accent': config.accent_color,
  } : {}

  return (
    <div className="min-h-screen" style={cssVars}>
      <Navbar config={config} />

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 animate-slow-zoom"
          style={{ backgroundImage: `url(${config?.hero_image || ''})` }}
        />
        <div className="absolute inset-0 gradient-hero opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 text-white w-full">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            {stats.members ? `${stats.members}+ members thriving` : 'Join the community'}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 animate-fade-in-up">
            {config?.app_name || 'ThriveHub'}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mb-3 font-medium">
            {config?.tagline || 'Skills, Sports & Adventure Community'}
          </p>
          {config?.hero_subtitle && (
            <p className="text-lg text-white/75 max-w-xl mb-8">{config.hero_subtitle}</p>
          )}
          <div className="flex flex-wrap gap-4 mb-12">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
            >
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/60 text-white rounded-2xl font-bold text-lg hover:bg-white/15 backdrop-blur-sm transition-all"
            >
              Sign In
            </Link>
          </div>
          {stats.communities > 0 && (
            <div className="flex flex-wrap gap-8 text-white/90">
              <div><span className="text-3xl font-bold text-white">{stats.members}</span><br /><span className="text-sm">Members</span></div>
              <div><span className="text-3xl font-bold text-white">{stats.communities}</span><br /><span className="text-sm">Communities</span></div>
              <div><span className="text-3xl font-bold text-white">{stats.events}</span><br /><span className="text-sm">Events</span></div>
              <div><span className="text-3xl font-bold text-white">{stats.skill_categories}</span><br /><span className="text-sm">Categories</span></div>
            </div>
          )}
        </div>
      </section>

      {/* Skill Categories */}
      {categories.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-3">Explore Your Passion</h2>
              <p className="text-slate-500 text-lg">Dance, comedy, sports, adventure & more — find your tribe</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
              {categories.map((cat) => (
                <Link
                  key={cat.code}
                  to="/register"
                  className="group relative rounded-2xl overflow-hidden aspect-[4/5] card-hover shadow-md"
                >
                  <img
                    src={cat.image_url}
                    alt={cat.label}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg leading-tight">{cat.label}</h3>
                    {cat.description && (
                      <p className="text-white/75 text-xs mt-1 line-clamp-2">{cat.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Communities */}
      {communities.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold gradient-text">Featured Communities</h2>
                <p className="text-slate-500 mt-1">Join groups built around what you love</p>
              </div>
              <Link to="/register" className="text-indigo-600 font-semibold hover:underline hidden sm:block">
                See all →
              </Link>
            </div>
            <Carousel>
              {communities.map((c) => (
                <Link
                  key={c.id}
                  to="/register"
                  className="flex-none w-72 snap-start rounded-2xl overflow-hidden shadow-md card-hover bg-white border border-slate-100"
                >
                  <div className="h-40 overflow-hidden">
                    <img src={c.cover_url} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg">{c.name}</h3>
                    <p className="text-slate-500 text-sm line-clamp-2 mt-1">{c.description}</p>
                    <p className="text-indigo-600 text-sm font-medium mt-2 flex items-center gap-1">
                      <Users className="w-4 h-4" /> {c.member_count} members
                    </p>
                  </div>
                </Link>
              ))}
            </Carousel>
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {events.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-indigo-50 via-pink-50 to-teal-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold gradient-text">Upcoming Events</h2>
                <p className="text-slate-500 mt-1">Workshops, meetups, and tournaments near you</p>
              </div>
            </div>
            <Carousel>
              {events.map((e) => (
                <div
                  key={e.id}
                  className="flex-none w-80 snap-start rounded-2xl overflow-hidden shadow-lg card-hover bg-white"
                >
                  <div className="h-44 relative">
                    <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 text-indigo-600 text-xs font-bold">
                      {formatEventDate(e.start_at)}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg">{e.title}</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" /> {e.venue}
                    </p>
                    <p className="text-slate-400 text-xs mt-2 line-clamp-2">{e.description}</p>
                    <p className="text-teal-600 text-sm font-medium mt-2">
                      {e.participant_count} registered
                    </p>
                  </div>
                </div>
              ))}
            </Carousel>
          </div>
        </section>
      )}

      {/* Community Moments */}
      {posts.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold gradient-text text-center mb-3">Community Moments</h2>
            <p className="text-slate-500 text-center mb-10">Real stories from real members</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((p) => (
                <div key={p.id} className="rounded-2xl overflow-hidden shadow-md card-hover bg-white border border-slate-100">
                  {p.image_url && (
                    <img src={p.image_url} alt="" className="w-full h-48 object-cover" loading="lazy" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {p.author_avatar && (
                        <img src={p.author_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      )}
                      <span className="font-semibold text-sm">{p.author_name}</span>
                    </div>
                    <p className="text-slate-600 text-sm line-clamp-3">{p.body}</p>
                    <div className="flex items-center gap-1 mt-3 text-pink-500 text-xs">
                      <Heart className="w-3.5 h-3.5" /> Loved by the community
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <section className="py-12 bg-slate-900">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-slate-400 text-center text-sm mb-6 uppercase tracking-wider">Community Partners</p>
            <div className="flex flex-wrap justify-center gap-6">
              {sponsors.map((s) => (
                <a
                  key={s.id}
                  href={s.link_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-64 rounded-xl overflow-hidden card-hover opacity-90 hover:opacity-100"
                >
                  <img src={s.image_url} alt={s.sponsor_name} className="w-full h-32 object-cover" loading="lazy" />
                  <div className="bg-slate-800 px-3 py-2 text-white text-sm font-medium text-center">
                    {s.sponsor_name}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 gradient-text">Why Join ThriveHub?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const Icon = icons[i % icons.length]
            return (
              <div key={f.code} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 card-hover">
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.label}</h3>
                <p className="text-slate-500 text-sm">{f.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-hero py-20 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="relative max-w-2xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-4">Ready to thrive?</h2>
          <p className="text-white/85 text-lg mb-8">
            Join dancers, comedians, athletes, artists, and adventurers building something amazing together.
          </p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
          >
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  )
}
