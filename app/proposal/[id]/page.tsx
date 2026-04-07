import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getProposalData(clientId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get client info
  const { data: client } = await supabase
    .from('flow_clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (!client) return null

  // Get stage data for proposal
  const { data: stageData } = await supabase
    .from('flow_stage_data')
    .select('*')
    .eq('client_id', clientId)
    .in('stage_key', ['proposal', 'discovery'])

  const fields = new Map<string, string>()
  stageData?.forEach((row: { stage_key: string; field_key: string; field_value: string }) => {
    fields.set(`${row.stage_key}:${row.field_key}`, row.field_value)
  })

  const proposalText = fields.get('proposal:generated_text') || ''
  const proposalStatus = fields.get('proposal:proposal_status') || 'Draft'
  const published = fields.get('proposal:published') === 'true'

  return {
    client,
    proposalText,
    proposalStatus,
    published,
  }
}

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('# '))
      return <h1 key={i} className="text-2xl font-bold text-stone-900 mt-6 mb-3">{line.replace('# ', '')}</h1>
    if (line.startsWith('## '))
      return <h2 key={i} className="text-xl font-bold text-stone-900 mt-5 mb-2">{line.replace('## ', '')}</h2>
    if (line.startsWith('### '))
      return <h3 key={i} className="text-lg font-semibold text-stone-800 mt-4 mb-1">{line.replace('### ', '')}</h3>
    if (line.startsWith('- '))
      return <li key={i} className="text-stone-700 ml-5 mb-1 list-disc">{formatInline(line.replace('- ', ''))}</li>
    if (line.startsWith('---'))
      return <hr key={i} className="my-6 border-stone-200" />
    if (line.trim() === '')
      return <div key={i} className="h-3" />
    return <p key={i} className="text-stone-700 mb-2 leading-relaxed">{formatInline(line)}</p>
  })
}

function formatInline(text: string) {
  // Handle **bold** text
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-stone-900">{part.replace(/\*\*/g, '')}</strong>
    }
    return part
  })
}

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getProposalData(id)

  if (!data || !data.published || !data.proposalText) {
    notFound()
  }

  const { client, proposalText } = data
  const currentDate = new Date().toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CS</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-stone-900 tracking-tight">ClubSheIs</h1>
              <p className="text-xs text-stone-500">Digital Marketing & Content Production</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400">{currentDate}</p>
          </div>
        </div>
      </header>

      {/* Proposal Content */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          {/* Banner */}
          <div className="bg-gradient-to-r from-amber-700 to-amber-900 px-8 py-8">
            <p className="text-amber-200 text-xs font-medium uppercase tracking-widest mb-2">Proposal</p>
            <h2 className="text-2xl font-bold text-white">
              {client.brand || client.name}
            </h2>
            <p className="text-amber-100 text-sm mt-1">
              Prepared for {client.name}
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-8">
            {renderMarkdown(proposalText)}
          </div>

          {/* Footer */}
          <div className="border-t border-stone-100 px-8 py-6 bg-stone-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500">Prepared by</p>
                <p className="text-sm font-semibold text-stone-800">Nyaki & Kopano</p>
                <p className="text-xs text-stone-500">ClubSheIs</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-500">Contact</p>
                <p className="text-sm text-stone-700">info@clubsheis.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Accept / Decline buttons */}
        <div className="mt-8 bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-stone-800 mb-3 text-center">Ready to get started?</h3>
          <div className="flex gap-3 justify-center">
            <a
              href={`mailto:info@clubsheis.com?subject=Proposal Accepted — ${encodeURIComponent(client.brand || client.name)}&body=Hi Nyaki %26 Kopano,%0A%0AI'd like to accept the proposal and get started!%0A%0AThanks,%0A${encodeURIComponent(client.name)}`}
              className="px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              Accept Proposal
            </a>
            <a
              href={`mailto:info@clubsheis.com?subject=Proposal Question — ${encodeURIComponent(client.brand || client.name)}&body=Hi Nyaki %26 Kopano,%0A%0AI have a few questions about the proposal.%0A%0A`}
              className="px-6 py-3 border border-stone-200 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              I Have Questions
            </a>
          </div>
          <p className="text-xs text-stone-400 text-center mt-3">
            Clicking these buttons will open an email to info@clubsheis.com
          </p>
        </div>

        {/* Powered by */}
        <p className="text-center text-xs text-stone-300 mt-8 pb-8">
          Powered by ClubSheIs Client Flow
        </p>
      </main>
    </div>
  )
}
