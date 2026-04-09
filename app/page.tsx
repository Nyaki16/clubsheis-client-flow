'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClients, getTimelineStartDates } from '@/lib/actions'
import { Client } from '@/lib/types'
import { STAGES, getActiveStagesForPackage, getDaysRemaining, getDeadlineDate } from '@/lib/stages'

function getStageLabel(key: string) {
  return STAGES.find(s => s.key === key)
}

function CountdownBadge({ startDate, isComplete }: { startDate: string | null; isComplete: boolean }) {
  if (!startDate) return null
  const daysLeft = getDaysRemaining(startDate)
  if (daysLeft === null) return null

  const deadline = getDeadlineDate(startDate)
  const isOverdue = daysLeft < 0
  const isUrgent = daysLeft <= 2 && daysLeft >= 0
  const totalDays = 14
  const elapsed = totalDays - daysLeft
  const progress = Math.min(Math.max((elapsed / totalDays) * 100, 0), 100)

  if (isComplete) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 bg-green-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
        </div>
        <span className="text-[10px] font-bold text-green-600">Done</span>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-bold ${
          isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-stone-500'
        }`}>
          {isOverdue
            ? `${Math.abs(daysLeft)}d overdue`
            : daysLeft === 0
            ? 'Due today!'
            : `${daysLeft}d left`
          }
        </span>
        <span className="text-[10px] text-stone-400">
          {deadline?.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div className={`w-full h-1.5 rounded-full overflow-hidden ${
        isOverdue ? 'bg-red-100' : isUrgent ? 'bg-amber-100' : 'bg-stone-200'
      }`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOverdue ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-[#B45309]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function StageProgress({ client, startDate }: { client: Client; startDate: string | null }) {
  const stage = getStageLabel(client.current_stage)
  const activeStages = client.package ? getActiveStagesForPackage(client.package) : STAGES.map(s => s.key)
  const currentIndex = activeStages.indexOf(client.current_stage)
  const progress = activeStages.length > 0 ? ((currentIndex + 1) / activeStages.length) * 100 : 0
  const isComplete = client.current_stage === 'wrapup'

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
      <CountdownBadge startDate={startDate} isComplete={isComplete} />
    </div>
  )
}

type SortOption = 'name' | 'stage' | 'added' | 'deadline'
type ViewMode = 'grid' | 'list'

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [timelineStarts, setTimelineStarts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('added')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const router = useRouter()

  useEffect(() => {
    Promise.all([getClients(), getTimelineStartDates()])
      .then(([c, t]) => { setClients(c); setTimelineStarts(t); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const activeClients = clients.filter(c => c.current_stage !== 'wrapup')
  const completedClients = clients.filter(c => c.current_stage === 'wrapup')

  // Search filter
  const filteredActive = activeClients.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.brand || '').toLowerCase().includes(q) ||
      (c.package || '').toLowerCase().replace(/-/g, ' ').includes(q) ||
      (getStageLabel(c.current_stage)?.name || '').toLowerCase().includes(q)
    )
  })

  // Sort
  const sortedActive = [...filteredActive].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'stage': {
        const aStages = a.package ? getActiveStagesForPackage(a.package) : STAGES.map(s => s.key)
        const bStages = b.package ? getActiveStagesForPackage(b.package) : STAGES.map(s => s.key)
        const aIdx = aStages.indexOf(a.current_stage)
        const bIdx = bStages.indexOf(b.current_stage)
        return bIdx - aIdx // furthest along first
      }
      case 'deadline': {
        const aStart = timelineStarts[a.id]
        const bStart = timelineStarts[b.id]
        const aDays = aStart ? getDaysRemaining(aStart) ?? 999 : 999
        const bDays = bStart ? getDaysRemaining(bStart) ?? 999 : 999
        return aDays - bDays // most urgent first
      }
      case 'added':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  // Helper for list view stage info
  const getProgressInfo = (client: Client) => {
    const stage = getStageLabel(client.current_stage)
    const activeStages = client.package ? getActiveStagesForPackage(client.package) : STAGES.map(s => s.key)
    const currentIndex = activeStages.indexOf(client.current_stage)
    const progress = activeStages.length > 0 ? ((currentIndex + 1) / activeStages.length) * 100 : 0
    return { stage, progress }
  }

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
              {/* Search, Sort, View controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
                {/* Search */}
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search clients, brands, packages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[rgba(180,83,9,0.2)] transition-colors"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-400 shrink-0">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortOption)}
                    className="text-xs border border-stone-200 rounded-lg px-2.5 py-2 bg-white text-stone-700 cursor-pointer focus:outline-none focus:border-[#B45309]"
                  >
                    <option value="added">Date Added</option>
                    <option value="name">Name A-Z</option>
                    <option value="stage">Furthest Along</option>
                    <option value="deadline">Most Urgent</option>
                  </select>
                </div>

                {/* View toggle */}
                <div className="flex border border-stone-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 cursor-pointer transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-[#B45309] text-white'
                        : 'bg-white text-stone-500 hover:bg-stone-50'
                    }`}
                    title="Grid view"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 cursor-pointer transition-colors ${
                      viewMode === 'list'
                        ? 'bg-[#B45309] text-white'
                        : 'bg-white text-stone-500 hover:bg-stone-50'
                    }`}
                    title="List view"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">
                  Active Clients {search && `(${sortedActive.length} of ${activeClients.length})`}
                </h2>
              </div>

              {/* No results */}
              {sortedActive.length === 0 && search && (
                <div className="text-center py-10 border border-dashed border-stone-200 rounded-xl bg-stone-50">
                  <p className="text-sm text-stone-500">No clients match &ldquo;{search}&rdquo;</p>
                  <button onClick={() => setSearch('')} className="text-xs text-[#B45309] mt-2 font-medium cursor-pointer hover:underline">Clear search</button>
                </div>
              )}

              {/* Grid View */}
              {viewMode === 'grid' && sortedActive.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedActive.map(client => (
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
                      <StageProgress client={client} startDate={timelineStarts[client.id] || null} />
                      <div className="mt-3 text-xs text-stone-400">
                        Added {new Date(client.created_at).toLocaleDateString('en-ZA')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && sortedActive.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    <div className="col-span-3">Client</div>
                    <div className="col-span-2">Package</div>
                    <div className="col-span-3">Current Stage</div>
                    <div className="col-span-2">Progress</div>
                    <div className="col-span-2 text-right">Deadline</div>
                  </div>

                  {/* Rows */}
                  {sortedActive.map((client, idx) => {
                    const { stage, progress } = getProgressInfo(client)
                    const startDate = timelineStarts[client.id] || null
                    const daysLeft = startDate ? getDaysRemaining(startDate) : null
                    const deadline = startDate ? getDeadlineDate(startDate) : null
                    const isOverdue = daysLeft !== null && daysLeft < 0
                    const isUrgent = daysLeft !== null && daysLeft <= 2 && daysLeft >= 0

                    return (
                      <div
                        key={client.id}
                        onClick={() => router.push(`/client/${client.id}`)}
                        className={`grid grid-cols-12 gap-3 px-4 py-3 items-center cursor-pointer hover:bg-[rgba(180,83,9,0.02)] transition-colors ${
                          idx < sortedActive.length - 1 ? 'border-b border-stone-100' : ''
                        }`}
                      >
                        {/* Client */}
                        <div className="col-span-3 min-w-0">
                          <p className="text-sm font-semibold text-stone-900 truncate">{client.name}</p>
                          {client.brand && <p className="text-xs text-stone-400 truncate">{client.brand}</p>}
                        </div>

                        {/* Package */}
                        <div className="col-span-2">
                          {client.package ? (
                            <span className="text-[10px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full capitalize whitespace-nowrap">
                              {client.package.replace(/-/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-xs text-stone-300">—</span>
                          )}
                        </div>

                        {/* Stage */}
                        <div className="col-span-3">
                          <span
                            className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ background: stage?.colorSoft, color: stage?.color }}
                          >
                            {stage?.name}
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="col-span-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${progress}%`, background: stage?.color }}
                            />
                          </div>
                          <span className="text-[10px] text-stone-400 w-7 text-right">{Math.round(progress)}%</span>
                        </div>

                        {/* Deadline */}
                        <div className="col-span-2 text-right">
                          {daysLeft !== null ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOverdue
                                ? 'bg-red-100 text-red-700'
                                : isUrgent
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-stone-100 text-stone-600'
                            }`}>
                              {isOverdue
                                ? `${Math.abs(daysLeft)}d over`
                                : daysLeft === 0
                                ? 'Today'
                                : `${daysLeft}d left`
                              }
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-300">No timeline</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
