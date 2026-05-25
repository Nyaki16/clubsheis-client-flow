import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { BriefToolbar } from './toolbar'

export const dynamic = 'force-dynamic'

async function getBriefData(clientId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: client } = await supabase
    .from('flow_clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (!client) return null

  const { data: stageData } = await supabase
    .from('flow_stage_data')
    .select('stage_key, field_key, field_value')
    .eq('client_id', clientId)
    .in('stage_key', ['strategy-brief', 'brand-bible'])

  const fields = new Map<string, string>()
  stageData?.forEach((row: { stage_key: string; field_key: string; field_value: string }) => {
    fields.set(`${row.stage_key}:${row.field_key}`, row.field_value)
  })

  return {
    client,
    briefText: fields.get('strategy-brief:brief_text') || '',
    approved: fields.get('strategy-brief:approved') === 'true',
    primaryColor: fields.get('brand-bible:primary_color') || '#0F766E',
    secondaryColor: fields.get('brand-bible:secondary_color') || '#FFFFFF',
    accentColor: fields.get('brand-bible:accent_color') || '#B45309',
    primaryFont: fields.get('brand-bible:primary_font') || '',
  }
}

// ── Markdown → Section parsing ──
type Section = { num: string; title: string; body: string }

function parseSections(text: string): { intro: string; sections: Section[]; outro: string } {
  const lines = text.split('\n')
  const sections: Section[] = []
  let intro = ''
  let outro = ''
  let currentSection: Section | null = null
  let buffer: string[] = []
  let beforeFirstSection = true
  let afterLastSection = false

  const sectionRegex = /^##\s*SECTION\s+(\d+(?:[A-Z])?)\s*[—\-]\s*(.+?)\s*$/i

  const flush = () => {
    if (currentSection) {
      currentSection.body = buffer.join('\n').trim()
      sections.push(currentSection)
      currentSection = null
    }
    buffer = []
  }

  for (const line of lines) {
    const match = line.match(sectionRegex)
    if (match) {
      if (beforeFirstSection) {
        intro = buffer.join('\n').trim()
        buffer = []
        beforeFirstSection = false
      } else {
        flush()
      }
      currentSection = { num: match[1], title: match[2].trim(), body: '' }
    } else if (line.trim().startsWith('---') && currentSection && sections.length === 8) {
      // Trailing separator before outro
      afterLastSection = true
      flush()
    } else if (afterLastSection) {
      outro += line + '\n'
    } else {
      buffer.push(line)
    }
  }
  if (currentSection) flush()
  outro = outro.trim()

  return { intro, sections, outro }
}

// ── Inline markdown formatting (bold, italic) ──
function formatInline(text: string): React.ReactNode {
  // Handle GAP / ASSUMPTION highlights
  if (text.includes('GAP:') || text.includes('[ASSUMPTION:')) {
    return <span className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded">{text}</span>
  }
  // Handle **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-stone-900">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

// ── Generic body renderer for any section ──
function renderBody(body: string, primaryColor: string): React.ReactNode {
  const lines = body.split('\n')
  const out: React.ReactNode[] = []
  let listBuffer: string[] = []
  let tableBuffer: string[] = []

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return
    out.push(
      <ul key={`ul-${key}`} className="space-y-2 my-4">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-3 text-stone-700 leading-relaxed">
            <span className="text-xs mt-2 flex-shrink-0" style={{ color: primaryColor }}>●</span>
            <span className="flex-1">{formatInline(item)}</span>
          </li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  const flushTable = (key: string) => {
    if (tableBuffer.length === 0) return
    const rows = tableBuffer.map(r => r.split('|').map(c => c.trim()).filter(Boolean))
    const header = rows[0] || []
    const body = rows.filter((_, i) => i > 1) // skip header + separator row
    out.push(
      <div key={`tbl-${key}`} className="my-6 overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full text-sm">
          <thead style={{ background: primaryColor }} className="text-white">
            <tr>
              {header.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {body.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-stone-700 align-top">{formatInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableBuffer = []
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd()

    // Table rows start with |
    if (line.trim().startsWith('|')) {
      flushList(`pre-tbl-${idx}`)
      tableBuffer.push(line.trim())
      return
    } else if (tableBuffer.length) {
      flushTable(`${idx}`)
    }

    if (line.startsWith('### ')) {
      flushList(`pre-h3-${idx}`)
      out.push(
        <h3 key={`h3-${idx}`} className="text-xl font-bold text-stone-900 mt-8 mb-3 leading-tight">
          {formatInline(line.replace('### ', ''))}
        </h3>
      )
    } else if (line.startsWith('## ')) {
      flushList(`pre-h2-${idx}`)
      out.push(
        <h2 key={`h2-${idx}`} className="text-2xl font-bold text-stone-900 mt-10 mb-4">
          {formatInline(line.replace('## ', ''))}
        </h2>
      )
    } else if (line.startsWith('- ')) {
      listBuffer.push(line.replace('- ', ''))
    } else if (line.trim() === '') {
      flushList(`empty-${idx}`)
      out.push(<div key={`spc-${idx}`} className="h-3" />)
    } else {
      flushList(`pre-p-${idx}`)
      out.push(
        <p key={`p-${idx}`} className="text-stone-700 leading-relaxed my-3">
          {formatInline(line)}
        </p>
      )
    }
  })
  flushList('end')
  flushTable('end')

  return out
}

// ── Custom renderers per section number ──

function SectionShell({ num, title, accent, children }: { num: string; title: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-3xl border border-stone-200 overflow-hidden mb-8 print:rounded-none print:border-0 print:mb-0 print:shadow-none print:break-before-page">
      <header
        className="px-10 py-8 print:px-8 print:py-6"
        style={{ background: `linear-gradient(135deg, ${accent}15 0%, ${accent}05 100%)`, borderBottom: `2px solid ${accent}` }}
      >
        <div className="flex items-baseline gap-4">
          <span className="text-5xl font-black tracking-tight" style={{ color: accent }}>{num.padStart(2, '0')}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 mb-1">Section {num}</p>
            <h2 className="text-3xl font-bold text-stone-900 leading-tight">{title}</h2>
          </div>
        </div>
      </header>
      <div className="px-10 py-8 print:px-8 print:py-6">{children}</div>
    </section>
  )
}

function CoverPage({ brand, name, accent, date }: { brand: string; name: string; accent: string; date: string }) {
  return (
    <section
      className="rounded-3xl overflow-hidden text-white relative mb-8 print:rounded-none print:break-after-page"
      style={{ background: `linear-gradient(135deg, ${accent} 0%, #1c1917 100%)`, minHeight: '600px' }}
    >
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full" style={{ background: `radial-gradient(circle, ${accent}80 0%, transparent 70%)` }} />
        <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full" style={{ background: `radial-gradient(circle, #fbbf2440 0%, transparent 70%)` }} />
      </div>
      <div className="relative h-full flex flex-col justify-between p-12 md:p-16 min-h-[600px]">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <span className="font-bold text-sm">CS</span>
            </div>
            <p className="text-sm font-medium opacity-80">ClubSheIs</p>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] opacity-60 mt-12 mb-4">The Creative Strategy</p>
        </div>
        <div>
          <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-[0.95] mb-4">
            {brand || name}
          </h1>
          <p className="text-xl md:text-2xl opacity-80 font-light max-w-2xl">
            The brief — what we're building, why it will work, and the order we'll prove it in.
          </p>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50 mb-1">Prepared for</p>
            <p className="text-lg font-semibold">{name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest opacity-50 mb-1">Date</p>
            <p className="text-lg font-semibold">{date}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function MethodologyCard({ accent }: { accent: string }) {
  return (
    <div className="bg-stone-900 text-white rounded-3xl p-10 md:p-12 mb-8 print:rounded-none print:break-after-page">
      <p className="text-xs uppercase tracking-[0.25em] mb-3" style={{ color: accent }}>The Method</p>
      <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">The DD Method.</h2>
      <p className="text-lg opacity-80 leading-relaxed max-w-2xl mb-8">
        A nine-part creative strategy framework built for direct-response paid social. Every recommendation in this brief is traced to evidence in your research — not vibes, not guesses.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {[
          { n: '01', t: 'Business Problem' },
          { n: '02', t: 'Product POV' },
          { n: '03', t: 'Customer Voice' },
          { n: '04', t: 'Personas' },
          { n: '05', t: 'Awareness Map' },
          { n: '06', t: 'Messaging Territories' },
          { n: '07', t: 'The Big Idea' },
          { n: '08', t: 'Concepts' },
        ].map(item => (
          <div key={item.n} className="flex gap-3 items-baseline">
            <span className="text-2xl font-black" style={{ color: accent }}>{item.n}</span>
            <span className="opacity-80 leading-snug">{item.t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClosingStatement({ outro, accent }: { outro: string; accent: string }) {
  if (!outro) return null
  return (
    <div className="rounded-3xl overflow-hidden text-white relative print:rounded-none" style={{ background: `linear-gradient(135deg, ${accent} 0%, #1c1917 100%)` }}>
      <div className="p-12 md:p-16">
        <p className="text-xs uppercase tracking-[0.3em] opacity-60 mb-6">The thesis</p>
        <p className="text-3xl md:text-4xl font-bold leading-tight max-w-3xl">{outro}</p>
        <div className="mt-12 pt-6 border-t border-white/20 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50 mb-1">Prepared by</p>
            <p className="text-sm font-semibold">Nyaki & Kopano — ClubSheIs</p>
          </div>
          <p className="text-xs opacity-50">info@clubsheis.com</p>
        </div>
      </div>
    </div>
  )
}

export default async function StrategyBriefPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const data = await getBriefData(clientId)

  if (!data || !data.briefText) {
    notFound()
  }

  const { client, briefText, primaryColor } = data
  const accent = primaryColor
  const currentDate = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

  const { intro, sections, outro } = parseSections(briefText)

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <BriefToolbar clientId={clientId} />

      <div className="min-h-screen bg-stone-100 print:bg-white">
        <main className="max-w-4xl mx-auto px-6 py-10 print:p-0 print:max-w-none">
          <CoverPage brand={client.brand || ''} name={client.name} accent={accent} date={currentDate} />

          <MethodologyCard accent={accent} />

          {intro && (
            <div className="bg-white rounded-3xl border border-stone-200 px-10 py-8 mb-8 print:rounded-none print:border-0 print:break-after-page">
              <p className="text-stone-600 italic leading-relaxed">{formatInline(intro)}</p>
            </div>
          )}

          {sections.map(section => (
            <SectionShell key={section.num} num={section.num} title={section.title} accent={accent}>
              {renderBody(section.body, accent)}
            </SectionShell>
          ))}

          <ClosingStatement outro={outro} accent={accent} />

          <p className="text-center text-xs text-stone-400 mt-8 pb-8 print:hidden">
            ClubSheIs Creative Strategy Brief • Built with the DD Method
          </p>
        </main>
      </div>
    </>
  )
}
