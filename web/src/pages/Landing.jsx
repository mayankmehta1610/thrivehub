import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Users, Calendar, MessageCircle, Trophy } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'

export default function Landing() {
  const [config, setConfig] = useState(null)

  useEffect(() => {
    api.getConfig().then(setConfig).catch(console.error)
  }, [])

  const features = config?.features || []
  const icons = [Trophy, Users, Calendar, MessageCircle]

  return (
    <div className="min-h-screen">
      <Navbar config={config} />

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${config?.hero_image || ''})` }}
        />
        <div className="absolute inset-0 gradient-hero opacity-85" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32 text-white">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            {config?.app_name || 'ThriveHub'}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mb-8">
            {config?.tagline || 'Skills, Sports & Adventure Community'}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-indigo-600 rounded-2xl font-bold text-lg hover:shadow-xl transition-shadow"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-3 border-2 border-white/50 text-white rounded-2xl font-bold text-lg hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

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

      <section className="gradient-hero py-16 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to thrive?</h2>
        <p className="text-white/80 mb-8">Join thousands showcasing skills, sports and adventures.</p>
        <Link to="/register" className="inline-block px-8 py-3 bg-white text-indigo-600 rounded-2xl font-bold text-lg">
          Create Free Account
        </Link>
      </section>
    </div>
  )
}
