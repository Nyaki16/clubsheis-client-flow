'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClients } from '@/lib/actions'
import { Client } from '@/lib/types'
import { STAGES, getActiveStagesForPackage } from '@/lib/stages'

function getStageLabel(key: string) {
  return STAGES.find(s => s.key === key)
}

function StageProgress({ client }: { client: Client }) {
  const stage = getStageLabel(client.current_stage)
  const activeStages = client.package ? getActiveStagesForPackage(client.package) : STAGES.map(s => s.key)
  const currentIndex = activeStages.indexOf(client.current_stage)
  const progress = activeStages.length > 0 ? ((currentIndex + 1) / activeStages.length) * 100 : 0

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ background: stage?.colorSoft, color: stage?.color }}
        >
          Stage {stage?.num}: {stage?.name}
        </span>
        <span className="text-xs text-stone-400">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: stage?.color }}
        />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getClients().then(c => { setClients(c); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const activeClients = clients.filter(c => c.current_stage !== 'wrapup')
  const completedClients = clients.filter(c => c.current_stage === 'wrapup')

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <div className="inline-flex items-center gap-2 bg-[rgba(180,83,9,0.05)] border border-[rgba(180,83,9,0.2)] rounded-full px-4 py-1.5 text-xs font-semibold text-[#B45309] uppercase tracking-wider mb-4">
            Client Flow System
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Dashboard
          </h1>
          <p className="text-stone-500 mt-1.5">
            {activeClients.length} active client{activeClients.length !== 1 ? 's' : ''} &middot; {completedClients.length} completed
          </p>
        </div>
        <button
          onClick={() => router.push('/client/new')}
          className="bg-[#B45309] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#92400E] transition-colors shadow-sm cursor-pointer"
        >
          + New Client
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-stone-400">Loading clients...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-xl font-semibold text-stone-700 mb-2">No clients yet</h2>
          <p className="text-stone-500 mb-6">Start your first client flow by adding a new client.</p>
          <button
            onClick={() => router.push('/client/new')}
            className="bg-[#B45309] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#92400E] transition-colors cursor-pointer"
          >
            Add Your First Client
          </button>
        </div>
      ) : (
        <>
          {activeClients.length > 0 && (
            <div className="mb-10">
              <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">Active Clients</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeClients.map(client => (
                  <div
                    key={client.id}
                    onClick={() => router.push(`/client/${client.id}`)}
                    className="bg-white border border-stone-200 rounded-xl p-5 cursor-pointer hover:border-[rgba(180,83,9,0.3)] hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-stone-900">{client.name}</h3>
                        {client.brand && <p className="text-sm text-stone-500">{client.brand}</p>}
                      </div>
                      {client.package && (
                        <span className="text-xs font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full capitalize">
                          {client.package.replace(/-/g, ' ')}
                        </span>
                      )}
                    </div>
                    <StageProgress client={client} />
                    <div className="mt-3 text-xs text-stone-400">
                      Added {new Date(client.created_at).toLocaleDateString('en-ZA')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedClients.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">Completed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedClients.map(client => (
                  <div
                    key={client.id}
                    onClick={() => router.push(`/client/${client.id}`)}
                    className="bg-white/60 border border-stone-200 rounded-xl p-5 cursor-pointer hover:border-stone-300 transition-all opacity-70"
                  >
                    <h3 className="font-semibold text-stone-700">{client.name}</h3>
                    {client.brand && <p className="text-sm text-stone-400">{client.brand}</p>}
                    <div className="mt-2 text-xs text-green-600 font-medium">Completed</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
