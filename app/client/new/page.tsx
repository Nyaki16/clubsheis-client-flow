'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/actions'
import { PACKAGES } from '@/lib/stages'

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    brand: '',
    email: '',
    phone: '',
    website: '',
    socials: '',
    needs: '',
    budget_range: '',
    package: '',
  })

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const client = await createClient(form)
      router.push(`/client/${client.id}`)
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-10">
      <button
        onClick={() => router.push('/')}
        className="text-sm text-stone-500 hover:text-stone-700 mb-6 inline-flex items-center gap-1 cursor-pointer"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-stone-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
        New Client
      </h1>
      <p className="text-stone-500 text-sm mb-8">Start the client flow — you can fill in more details as you go.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Required */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5">Contact Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Full name of lead"
            required
            className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Business / Brand Name</label>
            <input
              type="text"
              value={form.brand}
              onChange={e => update('brand', e.target.value)}
              placeholder="Their company or brand"
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="Primary email"
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="WhatsApp or phone"
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Website</label>
            <input
              type="text"
              value={form.website}
              onChange={e => update('website', e.target.value)}
              placeholder="Website URL"
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5">Social Handles</label>
          <input
            type="text"
            value={form.socials}
            onChange={e => update('socials', e.target.value)}
            placeholder="Instagram, LinkedIn, etc."
            className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5">What do they need?</label>
          <textarea
            value={form.needs}
            onChange={e => update('needs', e.target.value)}
            placeholder="Notes from initial conversation..."
            rows={3}
            className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Budget Range</label>
            <select
              value={form.budget_range}
              onChange={e => update('budget_range', e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20 bg-white"
            >
              <option value="">Select...</option>
              <option value="<10k">&lt;10k</option>
              <option value="10-25k">10-25k</option>
              <option value="25-50k">25-50k</option>
              <option value="50k+">50k+</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Package (optional)</label>
            <select
              value={form.package}
              onChange={e => update('package', e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20 bg-white"
            >
              <option value="">Decide later...</option>
              {PACKAGES.map(p => (
                <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="bg-[#B45309] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#92400E] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Creating...' : 'Start Client Flow'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="border border-stone-200 text-stone-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
