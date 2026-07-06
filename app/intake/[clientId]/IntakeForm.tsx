'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Field keys MUST match the `business-info` stage dataFields in lib/stages.ts
// so submissions land in the right rows and surface in the dashboard.

type Choice = { key: string; label: string; help?: string; required?: boolean }

const SECTIONS: { title: string; subtitle?: string; fields: Choice[] }[] = [
  {
    title: 'About your business',
    fields: [
      { key: 'business_name', label: 'Business name', help: 'The name your customers know you by', required: true },
      { key: 'business_niche', label: 'Business type / niche', help: 'e.g. Plumbing, Skincare clinic, Law firm', required: true },
      { key: 'location', label: 'Location', help: 'City + State/Province where you operate' },
      { key: 'business_hours', label: 'Business hours', help: 'e.g. Mon–Fri 8am–5pm, Sat 9am–1pm' },
    ],
  },
  {
    title: 'What you offer',
    fields: [
      { key: 'primary_service_1', label: 'Primary service 1', required: true },
      { key: 'primary_service_2', label: 'Primary service 2' },
      { key: 'primary_service_3', label: 'Primary service 3' },
    ],
  },
  {
    title: 'Goals & customers',
    fields: [],
  },
  {
    title: 'How customers reach you',
    fields: [],
  },
  {
    title: 'Getting found online (SEO)',
    subtitle: 'The location and services you most want to rank for on Google.',
    fields: [
      { key: 'seo_location', label: 'Main SEO location', help: 'The primary city/area you want to rank for' },
      { key: 'seo_service_1', label: 'Main SEO service 1' },
      { key: 'seo_service_2', label: 'Main SEO service 2' },
      { key: 'seo_service_3', label: 'Main SEO service 3' },
    ],
  },
  {
    title: 'Anything else',
    fields: [
      { key: 'special_details', label: 'Special business details', help: 'Anything important we should know about your business' },
    ],
  },
]

// Fields rendered as a dropdown of suggestions (with an "Other" free-text escape hatch).
const CHOICE_OPTIONS: Record<string, { label: string; help?: string; options: string[]; required?: boolean }> = {
  primary_offer: {
    label: 'Primary offer',
    help: 'The main hook you lead with',
    options: ['Free Estimate', 'Free Consultation', 'Discount', 'Same Day Service'],
  },
  main_goal: {
    label: 'Main goal',
    help: 'What should this work achieve?',
    options: ['Generate Leads', 'Book Appointments', 'Sales'],
    required: true,
  },
  target_audience: {
    label: 'Target audience',
    help: 'Who are your ideal customers?',
    options: ['Homeowners', 'Business Owners', 'Local Customers', 'High-End Clients'],
  },
  brand_style: {
    label: 'Brand style',
    help: 'How should your brand feel?',
    options: ['Luxury', 'Modern', 'Trustworthy', 'Professional', 'Friendly'],
  },
  main_cta: {
    label: 'Main call to action',
    help: 'What do you want customers to do?',
    options: ['Book Now', 'Get Quote', 'Call Now', 'Schedule Consultation'],
  },
}

const CHANNEL_OPTIONS = ['SMS', 'Email', 'Phone', 'Web Chat', 'Facebook', 'Instagram']

const ALL_KEYS = [
  'business_name', 'business_niche', 'location', 'business_hours',
  'primary_service_1', 'primary_service_2', 'primary_service_3',
  'primary_offer', 'main_goal', 'target_audience', 'main_cta',
  'brand_style', 'communication_channels',
  'seo_location', 'seo_service_1', 'seo_service_2', 'seo_service_3',
  'special_details',
]

const ACCENT = '#B45309'

interface ClientRow {
  id: string
  name: string
  brand: string
}

export default function IntakeForm({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<ClientRow | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const set = (key: string, val: string) => setValues(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: c } = await supabase
        .from('flow_clients')
        .select('id, name, brand')
        .eq('id', clientId)
        .single()

      if (cancelled) return
      if (!c) { setNotFound(true); setLoading(false); return }
      setClient(c)

      // Prefill from any existing business-info answers (lets a client resume/edit).
      const { data: rows } = await supabase
        .from('flow_stage_data')
        .select('field_key, field_value')
        .eq('client_id', clientId)
        .eq('stage_key', 'business-info')

      if (cancelled) return
      const prefill: Record<string, string> = {}
      rows?.forEach((r: { field_key: string; field_value: string }) => {
        if (ALL_KEYS.includes(r.field_key)) prefill[r.field_key] = r.field_value
      })
      if (c.brand && !prefill.business_name) prefill.business_name = c.brand
      if (rows?.some((r: { field_key: string }) => r.field_key === 'intake_submitted_at')) setSubmitted(true)
      setValues(prefill)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [clientId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!values.business_name?.trim()) { setError('Please enter your business name.'); return }
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const rows = ALL_KEYS
        .filter(key => (values[key] ?? '').trim() !== '')
        .map(key => ({
          client_id: clientId,
          stage_key: 'business-info',
          field_key: key,
          field_value: values[key].trim(),
          updated_at: now,
        }))
      rows.push({
        client_id: clientId,
        stage_key: 'business-info',
        field_key: 'intake_submitted_at',
        field_value: now,
        updated_at: now,
      })
      const { error: upErr } = await supabase
        .from('flow_stage_data')
        .upsert(rows, { onConflict: 'client_id,stage_key,field_key' })
      if (upErr) throw upErr
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error(err)
      setError('Something went wrong saving your answers. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (notFound || !client) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-stone-800 mb-2">Form not found</h1>
          <p className="text-sm text-stone-500">This intake link is invalid or has expired. Please check with your ClubSheIs contact.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
            <span className="text-white font-bold text-sm">CS</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-stone-900 tracking-tight">ClubSheIs</h1>
            <p className="text-xs text-stone-500">Business Information</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {submitted ? (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">Thank you!</h2>
            <p className="text-sm text-stone-600 max-w-sm mx-auto">
              We&apos;ve received your business information. The ClubSheIs team will use this to build out everything for {client.brand || client.name}. You can close this page.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-6 text-sm font-medium text-stone-500 hover:text-stone-700 underline underline-offset-2 cursor-pointer"
            >
              Need to change an answer? Edit your responses
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-stone-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                Tell us about your business
              </h2>
              <p className="text-stone-500 text-sm">
                Hi {client.name.split(' ')[0]} — these details help us build everything for {client.brand || 'your business'} the right way.
                It takes about 5 minutes. Fill in what you can.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* About your business */}
              <Section title={SECTIONS[0].title}>
                {SECTIONS[0].fields.map(f => (
                  <TextField key={f.key} field={f} value={values[f.key] || ''} onChange={v => set(f.key, v)} />
                ))}
              </Section>

              {/* What you offer */}
              <Section title={SECTIONS[1].title} subtitle="Your top services and the main offer you lead with.">
                {SECTIONS[1].fields.map(f => (
                  <TextField key={f.key} field={f} value={values[f.key] || ''} onChange={v => set(f.key, v)} />
                ))}
                <ChoiceField
                  fieldKey="primary_offer"
                  value={values.primary_offer || ''}
                  onChange={v => set('primary_offer', v)}
                />
              </Section>

              {/* Goals & customers */}
              <Section title={SECTIONS[2].title}>
                <ChoiceField fieldKey="main_goal" value={values.main_goal || ''} onChange={v => set('main_goal', v)} />
                <ChoiceField fieldKey="target_audience" value={values.target_audience || ''} onChange={v => set('target_audience', v)} />
                <ChoiceField fieldKey="main_cta" value={values.main_cta || ''} onChange={v => set('main_cta', v)} />
                <ChoiceField fieldKey="brand_style" value={values.brand_style || ''} onChange={v => set('brand_style', v)} />
              </Section>

              {/* Communication channels */}
              <Section title={SECTIONS[3].title} subtitle="How should customers be able to contact you? Select all that apply.">
                <ChannelField value={values.communication_channels || ''} onChange={v => set('communication_channels', v)} />
              </Section>

              {/* SEO */}
              <Section title={SECTIONS[4].title} subtitle={SECTIONS[4].subtitle}>
                {SECTIONS[4].fields.map(f => (
                  <TextField key={f.key} field={f} value={values[f.key] || ''} onChange={v => set(f.key, v)} />
                ))}
              </Section>

              {/* Anything else */}
              <Section title={SECTIONS[5].title}>
                {SECTIONS[5].fields.map(f => (
                  <TextArea key={f.key} field={f} value={values[f.key] || ''} onChange={v => set(f.key, v)} />
                ))}
              </Section>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
              )}

              <div className="pt-2 pb-10">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: ACCENT }}
                >
                  {saving ? 'Submitting…' : 'Submit business information'}
                </button>
                <p className="text-center text-xs text-stone-400 mt-4">Powered by ClubSheIs Client Flow</p>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
      <h3 className="text-base font-bold text-stone-900">{title}</h3>
      {subtitle && <p className="text-xs text-stone-500 mt-1 mb-4">{subtitle}</p>}
      <div className={`space-y-4 ${subtitle ? '' : 'mt-4'}`}>{children}</div>
    </div>
  )
}

const inputClass =
  'w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20 bg-white'

function Label({ field }: { field: Choice }) {
  return (
    <label className="block text-sm font-semibold text-stone-700 mb-1.5">
      {field.label}{field.required && <span className="text-[#B45309]"> *</span>}
    </label>
  )
}

function TextField({ field, value, onChange }: { field: Choice; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label field={field} />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={field.help} className={inputClass} required={field.required} />
    </div>
  )
}

function TextArea({ field, value, onChange }: { field: Choice; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label field={field} />
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={field.help} rows={4} className={`${inputClass} resize-none`} />
    </div>
  )
}

function ChoiceField({ fieldKey, value, onChange }: { fieldKey: string; value: string; onChange: (v: string) => void }) {
  const cfg = CHOICE_OPTIONS[fieldKey]
  const [otherPicked, setOtherPicked] = useState(false)
  // Show the free-text box when the user explicitly picked "Other", or when the
  // current value (e.g. prefilled from a past submission) isn't one of the options.
  const showOther = otherPicked || (value !== '' && !cfg.options.includes(value))

  return (
    <div>
      <Label field={{ key: fieldKey, label: cfg.label, required: cfg.required }} />
      {cfg.help && <p className="text-xs text-stone-400 mb-1.5 -mt-1">{cfg.help}</p>}
      <select
        value={showOther ? '__other__' : value}
        onChange={e => {
          if (e.target.value === '__other__') { setOtherPicked(true); onChange('') }
          else { setOtherPicked(false); onChange(e.target.value) }
        }}
        className={inputClass}
        required={cfg.required}
      >
        <option value="">Select…</option>
        {cfg.options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__other__">Other…</option>
      </select>
      {showOther && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Type your answer"
          className={`${inputClass} mt-2`}
          autoFocus
        />
      )}
    </div>
  )
}

function ChannelField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
  const known = selected.filter(s => CHANNEL_OPTIONS.includes(s))
  const otherVal = selected.filter(s => !CHANNEL_OPTIONS.includes(s)).join(', ')

  const toggle = (opt: string) => {
    const next = known.includes(opt) ? known.filter(k => k !== opt) : [...known, opt]
    onChange([...next, otherVal].filter(Boolean).join(', '))
  }
  const setOther = (v: string) => {
    onChange([...known, v.trim()].filter(Boolean).join(', '))
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CHANNEL_OPTIONS.map(opt => {
          const on = known.includes(opt)
          return (
            <button
              type="button"
              key={opt}
              onClick={() => toggle(opt)}
              className={`text-sm rounded-lg px-3 py-2.5 border transition-colors cursor-pointer ${
                on ? 'border-[#B45309] bg-[#B45309]/5 text-[#92400E] font-medium' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {on ? '✓ ' : ''}{opt}
            </button>
          )
        })}
      </div>
      <input
        type="text"
        defaultValue={otherVal}
        onBlur={e => setOther(e.target.value)}
        placeholder="Other channels (optional)"
        className={`${inputClass} mt-2`}
      />
    </div>
  )
}
