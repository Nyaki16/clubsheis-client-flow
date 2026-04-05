'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { getClient, getCompletions, getStageData, updateClient, toggleSubstep, saveStageField, deleteClient } from '@/lib/actions'
import { Client, StageCompletion, StageFieldValue } from '@/lib/types'
import { STAGES, getActiveStagesForPackage, PACKAGES, ADS_EMAIL_SOCIAL_TRACKS } from '@/lib/stages'
import { StageDefinition, DataField } from '@/lib/types'

// ── Data field input component ──
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: DataField
  value: string
  onChange: (val: string) => void
}) {
  const base = "w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20 bg-white"

  if (field.type === 'select') {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className={base}>
        <option value="">{field.placeholder}</option>
        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    )
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={2}
        className={`${base} resize-none`}
      />
    )
  }
  if (field.type === 'date') {
    return (
      <input type="date" value={value} onChange={e => onChange(e.target.value)} className={base} />
    )
  }
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={base}
    />
  )
}

// ── Stage panel component ──
function StagePanel({
  stage,
  isActive,
  isCurrent,
  isCompleted,
  completions,
  fieldValues,
  onToggleSubstep,
  onSaveField,
  onAdvance,
  canAdvance,
  nextStageName,
  actionSlot,
  actionSlotFullWidth,
}: {
  stage: StageDefinition
  isActive: boolean
  isCurrent: boolean
  isCompleted: boolean
  completions: Map<string, boolean>
  fieldValues: Map<string, string>
  onToggleSubstep: (stageKey: string, index: number, completed: boolean) => void
  onSaveField: (stageKey: string, fieldKey: string, value: string) => void
  onAdvance: () => void
  canAdvance: boolean
  nextStageName: string
  actionSlot?: React.ReactNode
  actionSlotFullWidth?: boolean
}) {
  const [expanded, setExpanded] = useState(isCurrent)

  const totalSubsteps = stage.substeps.length
  const completedCount = stage.substeps.filter((_, i) => completions.get(`${stage.key}:${i}`)).length
  const allDone = completedCount === totalSubsteps && totalSubsteps > 0

  return (
    <div className={`${!isActive && !isCompleted ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-4 p-4 sm:p-5 bg-white border rounded-xl cursor-pointer transition-all ${
          isCurrent
            ? 'border-[rgba(180,83,9,0.4)] shadow-sm ring-1 ring-[rgba(180,83,9,0.1)]'
            : isCompleted
            ? 'border-green-200 bg-green-50/30'
            : 'border-stone-200 hover:border-stone-300'
        }`}
      >
        {/* Stage number */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            background: isCompleted ? 'rgba(22,163,74,0.08)' : stage.colorSoft,
            color: isCompleted ? '#16A34A' : stage.color,
          }}
        >
          {isCompleted ? '✓' : stage.num}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-900 text-sm sm:text-base">{stage.name}</span>
            {isCurrent && (
              <span className="text-xs font-semibold text-[#B45309] bg-[rgba(180,83,9,0.06)] px-2 py-0.5 rounded-full">
                CURRENT
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">{stage.summary}</p>

          {/* Progress bar */}
          {(isActive || isCompleted) && totalSubsteps > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(completedCount / totalSubsteps) * 100}%`,
                    background: isCompleted ? '#16A34A' : stage.color,
                  }}
                />
              </div>
              <span className="text-xs text-stone-400 shrink-0">{completedCount}/{totalSubsteps}</span>
            </div>
          )}
        </div>

        <div className={`text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</div>
      </div>

      {/* Expanded detail */}
      {expanded && (isActive || isCompleted) && (
        <div className="bg-white border border-t-0 border-stone-200 rounded-b-xl -mt-1 p-4 sm:p-6 space-y-6">
          {/* Stage guide */}
          {stage.guide && stage.guide.length > 0 && (
            <div className="bg-[rgba(180,83,9,0.03)] border border-[rgba(180,83,9,0.12)] rounded-lg p-4">
              <h4 className="text-xs font-bold text-[#B45309] uppercase tracking-wider mb-3">
                {stage.substeps.length === 0 ? 'Guiding Questions' : 'Guide for This Stage'}
              </h4>
              <ol className="space-y-2">
                {stage.guide.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-stone-700">
                    <span className="font-bold text-[#B45309] shrink-0 text-xs mt-0.5">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Substep checklist */}
          {stage.substeps.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-stone-700 mb-3">
              {stage.parallelTracks ? 'Parallel Tracks' : 'Steps to Complete'}
            </h4>

            {stage.parallelTracks ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {stage.parallelTracks.map((track, trackIdx) => {
                  const trackOffset = trackIdx * track.steps.length
                  return (
                    <div key={track.name} className="border border-stone-200 rounded-lg p-4">
                      <h5 className="font-semibold text-sm mb-3">{track.icon} {track.name}</h5>
                      <div className="space-y-2">
                        {track.steps.map((step, stepIdx) => {
                          const globalIdx = trackOffset + stepIdx
                          const done = completions.get(`${stage.key}:${globalIdx}`) || false
                          return (
                            <label key={stepIdx} className="flex items-start gap-2.5 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={() => onToggleSubstep(stage.key, globalIdx, !done)}
                                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-[#B45309] accent-[#B45309] cursor-pointer"
                              />
                              <span className={`text-xs ${done ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                                {step}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {stage.substeps.map((sub, i) => {
                  const done = completions.get(`${stage.key}:${i}`) || false
                  return (
                    <label key={i} className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-stone-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => onToggleSubstep(stage.key, i, !done)}
                        className="mt-0.5 h-4 w-4 rounded border-stone-300 text-[#B45309] accent-[#B45309] cursor-pointer"
                      />
                      <div className={done ? 'opacity-50' : ''}>
                        <span className={`text-sm font-medium ${done ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {sub.label}
                        </span>
                        <p className="text-xs text-stone-500 mt-0.5">{sub.description}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
          )}

          {/* Data fields */}
          {stage.dataFields.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-stone-700 mb-3">Data for this stage</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stage.dataFields.map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                      {field.label}
                    </label>
                    <FieldInput
                      field={field}
                      value={fieldValues.get(`${stage.key}:${field.key}`) || ''}
                      onChange={val => onSaveField(stage.key, field.key, val)}
                    />
                  </div>
                ))}
                {/* Inline action slot — for small buttons like Generate Proposal */}
                {actionSlot && !actionSlotFullWidth && <div className="flex items-end">{actionSlot}</div>}
              </div>
              {/* Full-width action slot — for proposal review panel */}
              {actionSlot && actionSlotFullWidth && <div className="mt-4">{actionSlot}</div>}
            </div>
          )}

          {/* Next action / advance */}
          {isCurrent && (
            <div className="bg-[rgba(22,163,74,0.05)] border border-[rgba(22,163,74,0.15)] rounded-lg p-4">
              <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Next Action</div>
              <p className="text-sm text-stone-700">{stage.nextActionPrompt}</p>
              {canAdvance && (
                <button
                  onClick={onAdvance}
                  className="mt-3 bg-[#16A34A] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer"
                >
                  Complete Stage & Move to {nextStageName} →
                </button>
              )}
              {!allDone && totalSubsteps > 0 && (
                <p className="mt-2 text-xs text-stone-400">Complete all substeps to advance to the next stage.</p>
              )}
            </div>
          )}

          {/* Conditional logic — always last */}
          {stage.conditionalLogic.length > 0 && (
            <div className="bg-[rgba(147,51,234,0.04)] border border-[rgba(147,51,234,0.12)] rounded-lg p-4">
              <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">Conditional Logic</h4>
              {stage.conditionalLogic.map((rule, i) => (
                <div key={i} className="flex gap-2 py-1 text-sm">
                  <span className="font-semibold text-purple-600 shrink-0">IF</span>
                  <span className="text-stone-600">{rule.condition}</span>
                  <span className="font-semibold text-stone-800">→ {rule.result}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// ── Discovery stage action buttons ──
function DiscoveryActions({
  leadStatus,
  client,
  fieldValues,
  onSaveField,
  onAdvance,
}: {
  leadStatus: string
  client: Client
  fieldValues: Map<string, string>
  onSaveField: (stageKey: string, fieldKey: string, value: string) => void
  onAdvance: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const [proposal, setProposal] = useState(fieldValues.get('proposal:generated_text') || '')
  const [editing, setEditing] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Sync proposal from fieldValues when they change
  useEffect(() => {
    const saved = fieldValues.get('proposal:generated_text')
    if (saved && !proposal) setProposal(saved)
  }, [fieldValues, proposal])

  const handleGenerateProposal = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.name,
          brandName: client.brand,
          email: client.email,
          needs: fieldValues.get('discovery:what_they_need') || client.needs,
          transcriptNotes: fieldValues.get('discovery:transcript_link') || '',
          budgetRange: client.budget_range,
        }),
      })
      const data = await res.json()
      if (data.proposal) {
        setProposal(data.proposal)
        await onSaveField('proposal', 'generated_text', data.proposal)
      }
    } catch (err) {
      console.error('Failed to generate proposal:', err)
    }
    setGenerating(false)
  }

  const handleSaveProposal = async () => {
    await onSaveField('proposal', 'generated_text', proposal)
    setEditing(false)
  }

  const [sendingThankYou, setSendingThankYou] = useState(false)
  const [thankYouSent, setThankYouSent] = useState(false)

  const handleSendProposal = () => {
    // Proposal sending is handled in ProposalReview component
    setSendingEmail(true)
  }

  const handleSendThankYou = async () => {
    if (!client.email) { alert('No email address for this client.'); return }
    setSendingThankYou(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.email,
          subject: `Thank you for chatting with ClubSheIs`,
          body: `Hi ${client.name},\n\nThank you so much for taking the time to chat with us. We really enjoyed learning about ${client.brand || 'your business'}.\n\nAfter our conversation, we don't think we're the best fit for what you need right now — but we genuinely wish you all the best with your next steps.\n\nIf things change in the future, our door is always open.\n\nWarm regards,\nNyaki & Kopano\nClubSheIs`,
          attachAboutUs: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setThankYouSent(true)
    } catch (err) {
      alert(`Failed to send email: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setSendingThankYou(false)
  }

  if (!leadStatus) return null

  // Not a Fit — inline button
  if (leadStatus.includes('Not a Fit')) {
    return thankYouSent ? (
      <div className="w-full bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm font-semibold text-center">
        ✓ Thank you email sent to {client.email}
      </div>
    ) : (
      <button
        onClick={handleSendThankYou}
        disabled={sendingThankYou}
        className="w-full bg-rose-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
      >
        {sendingThankYou ? 'Sending...' : 'Send Thank You Email'}
      </button>
    )
  }

  // Follow Up — inline label
  if (leadStatus.includes('Follow Up')) {
    return (
      <div className="text-sm text-blue-600 font-medium pt-2">
        Follow up in 2 weeks
      </div>
    )
  }

  // Good Fit — generate button or "proposal ready" confirmation
  return (
    <button
      onClick={handleGenerateProposal}
      disabled={generating}
      className={`w-full px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
        proposal
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-[#16A34A] text-white hover:bg-green-700'
      }`}
    >
      {generating ? 'Generating...' : proposal ? 'Regenerate Proposal' : 'Generate Proposal'}
    </button>
  )
}

// ── Proposal review component for Stage 2 ──
function ProposalReview({
  client,
  fieldValues,
  onSaveField,
  onAdvance,
}: {
  client: Client
  fieldValues: Map<string, string>
  onSaveField: (stageKey: string, fieldKey: string, value: string) => void
  onAdvance: () => void
}) {
  const savedProposal = fieldValues.get('proposal:generated_text') || ''
  const [proposal, setProposal] = useState(savedProposal)
  const [editing, setEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')

  useEffect(() => {
    const saved = fieldValues.get('proposal:generated_text')
    if (saved && saved !== proposal) setProposal(saved)
  }, [fieldValues]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    await onSaveField('proposal', 'generated_text', proposal)
    setEditing(false)
  }

  const handleSendEmail = async () => {
    if (!client.email) { alert('No email address for this client.'); return }
    setSending(true)
    setSendError('')
    try {
      const emailBody = `Hi ${client.name},\n\nPlease find our proposal below. We've also attached our About Us document for your reference.\n\n---\n\n${proposal}\n\n---\n\nLooking forward to hearing from you.\n\nWarm regards,\nNyaki & Kopano\nClubSheIs`

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.email,
          subject: `ClubSheIs Proposal for ${client.brand || client.name}`,
          body: emailBody,
          attachAboutUs: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSent(true)
      onSaveField('proposal', 'proposal_status', 'Sent')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send email')
    }
    setSending(false)
  }

  if (!proposal) {
    return (
      <div className="text-center py-8 text-stone-400">
        <p className="text-sm">No proposal generated yet.</p>
        <p className="text-xs mt-1">Go back to the Discovery Call stage and click "Generate Proposal" first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Proposal card */}
      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <div className="bg-stone-50 px-4 py-3 flex items-center justify-between border-b border-stone-200">
          <div>
            <h4 className="text-sm font-semibold text-stone-900">Proposal for {client.brand || client.name}</h4>
            <p className="text-xs text-stone-500">Review and edit before sending</p>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-xs border border-stone-200 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
              >
                Edit
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="text-xs bg-[#B45309] text-white px-3 py-1.5 rounded-lg hover:bg-amber-800 transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <textarea
            value={proposal}
            onChange={e => setProposal(e.target.value)}
            className="w-full p-4 text-sm text-stone-700 leading-relaxed min-h-[400px] focus:outline-none resize-none font-mono"
          />
        ) : (
          <div className="p-4 text-sm text-stone-700 leading-relaxed max-h-[500px] overflow-y-auto">
            {proposal.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h2 key={i} className="text-lg font-bold text-stone-900 mt-4 mb-2">{line.replace('# ', '')}</h2>
              if (line.startsWith('## ')) return <h3 key={i} className="text-base font-bold text-stone-900 mt-3 mb-1">{line.replace('## ', '')}</h3>
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-stone-900 mt-2">{line.replace(/\*\*/g, '')}</p>
              if (line.startsWith('- ')) return <p key={i} className="pl-4 text-stone-600">&bull; {line.replace('- ', '')}</p>
              if (line.trim() === '') return <br key={i} />
              return <p key={i} className="text-stone-700">{line.replace(/\*\*/g, '').replace(/\*/g, '')}</p>
            })}
          </div>
        )}
      </div>

      {/* About Us PDF attachment */}
      <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
        <span className="text-lg">📎</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-stone-700">ClubSheIs About Us</p>
          <p className="text-xs text-stone-400">PDF attachment — will be included with the proposal email</p>
        </div>
        <a
          href="/ClubSheIs-About-Us.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
        >
          Preview / Download
        </a>
      </div>

      {/* Send button */}
      {sent ? (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4 text-center">
          <p className="text-sm font-semibold text-green-700">✓ Proposal sent to {client.email}</p>
          <p className="text-xs text-green-600 mt-1">Sent from info@clubsheis.com with About Us PDF attached</p>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
          <div className="flex-1">
            <p className="text-xs text-stone-500">
              Sends from <strong>info@clubsheis.com</strong> with the About Us PDF attached.
            </p>
            {sendError && (
              <p className="text-xs text-red-600 mt-1">{sendError}</p>
            )}
          </div>
          <button
            onClick={handleSendEmail}
            disabled={!client.email || editing || sending}
            className="bg-[#B45309] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors cursor-pointer disabled:opacity-50 shrink-0 ml-4"
          >
            {sending ? 'Sending...' : 'Send Proposal via Email'}
          </button>
        </div>
      )}
    </div>
  )
}


// ── Main client page ──
export default function ClientFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [completions, setCompletions] = useState<Map<string, boolean>>(new Map())
  const [fieldValues, setFieldValues] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)
  const [showTrackSelector, setShowTrackSelector] = useState(false)
  const [selectedTracks, setSelectedTracks] = useState<string[]>(['ads', 'email', 'social'])
  const activeTracks = (fieldValues.get('_config:active_tracks') || '').split(',').filter(Boolean)

  const loadData = useCallback(async () => {
    try {
      const [c, comps, fields] = await Promise.all([
        getClient(id),
        getCompletions(id),
        getStageData(id),
      ])
      setClient(c)

      const compMap = new Map<string, boolean>()
      comps.forEach(comp => compMap.set(`${comp.stage_key}:${comp.substep_index}`, comp.completed))
      setCompletions(compMap)

      const fieldMap = new Map<string, string>()
      fields.forEach(f => fieldMap.set(`${f.stage_key}:${f.field_key}`, f.field_value))
      setFieldValues(fieldMap)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const handleToggleSubstep = async (stageKey: string, index: number, completed: boolean) => {
    setCompletions(prev => {
      const next = new Map(prev)
      next.set(`${stageKey}:${index}`, completed)
      return next
    })
    await toggleSubstep(id, stageKey, index, completed, 'team')
  }

  const handleSaveField = async (stageKey: string, fieldKey: string, value: string) => {
    setFieldValues(prev => {
      const next = new Map(prev)
      next.set(`${stageKey}:${fieldKey}`, value)
      return next
    })
    await saveStageField(id, stageKey, fieldKey, value)
  }

  const handleAdvance = async (nextStageKey: string) => {
    if (!client) return
    await updateClient(id, { current_stage: nextStageKey } as Partial<Client>)
    setClient(prev => prev ? { ...prev, current_stage: nextStageKey } : prev)
  }

  const handlePackageChange = async (pkg: string) => {
    if (!client) return
    await updateClient(id, { package: pkg } as Partial<Client>)
    setClient(prev => prev ? { ...prev, package: pkg } : prev)
  }

  const handleDelete = async () => {
    await deleteClient(id)
    router.push('/')
  }

  if (loading) return <div className="text-center py-20 text-stone-400">Loading...</div>
  if (!client) return <div className="text-center py-20 text-stone-500">Client not found</div>

  // Determine active stages
  const activeStageKeys = client.package
    ? getActiveStagesForPackage(client.package)
    : STAGES.map(s => s.key)

  const currentIdx = activeStageKeys.indexOf(client.current_stage)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-stone-500 hover:text-stone-700 mb-4 inline-flex items-center gap-1 cursor-pointer"
          >
            ← Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            {client.name}
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {client.brand && <span className="text-sm text-stone-500">{client.brand}</span>}
            {client.email && <span className="text-xs text-stone-400">{client.email}</span>}
          </div>
        </div>
        <button
          onClick={() => setShowDelete(true)}
          className="text-xs text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
        >
          Delete
        </button>
      </div>

      {/* Package selector */}
      {!client.package && (
        <div className="bg-[rgba(180,83,9,0.04)] border border-[rgba(180,83,9,0.2)] rounded-xl p-5 mb-8">
          <h3 className="font-semibold text-stone-900 mb-2">Select a package to activate the right flow</h3>
          <p className="text-sm text-stone-500 mb-4">This determines which stages and branches appear in the timeline below.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PACKAGES.map(pkg => (
              <button
                key={pkg.value}
                onClick={() => {
                  if (pkg.value === 'ads-email-social') {
                    setShowTrackSelector(true)
                  } else {
                    handlePackageChange(pkg.value)
                  }
                }}
                className="border-2 border-stone-200 rounded-lg p-4 text-left hover:border-[#B45309] transition-colors cursor-pointer bg-white"
              >
                <div className="text-lg mb-1.5">{pkg.icon}</div>
                <div className="font-semibold text-sm text-stone-900">{pkg.label}</div>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">{pkg.description}</p>
              </button>
            ))}
          </div>

          {/* Track selector for Ads + Email + Social */}
          {showTrackSelector && (
            <div className="mt-4 border border-[rgba(225,29,72,0.2)] bg-[rgba(225,29,72,0.03)] rounded-lg p-4">
              <h4 className="font-semibold text-sm text-stone-900 mb-1">Which tracks does this client need?</h4>
              <p className="text-xs text-stone-500 mb-3">Select at least one. These will appear as parallel tracks in the flow.</p>
              <div className="space-y-2">
                {ADS_EMAIL_SOCIAL_TRACKS.map(track => (
                  <label key={track.value} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedTracks.includes(track.value)}
                      onChange={() => {
                        setSelectedTracks(prev =>
                          prev.includes(track.value)
                            ? prev.filter(t => t !== track.value)
                            : [...prev, track.value]
                        )
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-[#E11D48] cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-medium text-stone-900">{track.icon} {track.label}</span>
                      <p className="text-xs text-stone-500">{track.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    await handlePackageChange('ads-email-social')
                    await saveStageField(id, '_config', 'active_tracks', selectedTracks.join(','))
                    setShowTrackSelector(false)
                  }}
                  disabled={selectedTracks.length === 0}
                  className="bg-[#E11D48] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Confirm Tracks
                </button>
                <button
                  onClick={() => { setShowTrackSelector(false); setSelectedTracks([]) }}
                  className="border border-stone-200 text-stone-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {client.package && (
        <div className="mb-8">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-stone-400">Package:</span>
            <span className="font-semibold text-stone-700">{PACKAGES.find(p => p.value === client.package)?.label || client.package.replace(/-/g, ' ')}</span>
            {client.package === 'ads-email-social' && activeTracks.length > 0 && (
              <span className="text-xs text-stone-400">
                ({activeTracks.map(t => ADS_EMAIL_SOCIAL_TRACKS.find(tr => tr.value === t)?.label).filter(Boolean).join(' + ')})
              </span>
            )}
            <button
              onClick={() => handlePackageChange('')}
              className="text-xs text-stone-400 hover:text-stone-600 underline cursor-pointer"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Stage timeline */}
      <div className="space-y-3">
        {STAGES.filter(s => activeStageKeys.includes(s.key)).map((stage, idx) => {
          const stageIdx = activeStageKeys.indexOf(stage.key)
          const isCurrent = stage.key === client.current_stage
          const isCompleted = stageIdx < currentIdx
          const isActive = isCurrent

          const totalSubsteps = stage.substeps.length
          const completedCount = stage.substeps.filter((_, i) =>
            completions.get(`${stage.key}:${i}`)
          ).length
          const allDone = totalSubsteps === 0 || (completedCount === totalSubsteps && totalSubsteps > 0)

          const nextStageKey = activeStageKeys[stageIdx + 1]
          const nextStage = STAGES.find(s => s.key === nextStageKey)

          return (
            <div key={stage.key}>
              <StagePanel
                stage={stage}
                isActive={isActive}
                isCurrent={isCurrent}
                isCompleted={isCompleted}
                completions={completions}
                fieldValues={fieldValues}
                onToggleSubstep={handleToggleSubstep}
                onSaveField={handleSaveField}
                onAdvance={() => nextStageKey && handleAdvance(nextStageKey)}
                canAdvance={allDone && !!nextStageKey}
                nextStageName={nextStage?.name || 'Next'}
                actionSlot={
                  stage.key === 'discovery' ? (
                    <DiscoveryActions
                      leadStatus={fieldValues.get('discovery:lead_status') || ''}
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                      onAdvance={() => nextStageKey && handleAdvance(nextStageKey)}
                    />
                  ) : stage.key === 'proposal' ? (
                    <ProposalReview
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                      onAdvance={() => nextStageKey && handleAdvance(nextStageKey)}
                    />
                  ) : undefined
                }
                actionSlotFullWidth={stage.key === 'proposal'}
              />
              {idx < activeStageKeys.length - 1 && (
                <div className="flex justify-center">
                  <div className="w-0.5 h-3 bg-stone-200" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-stone-900 mb-2">Delete this client?</h3>
            <p className="text-sm text-stone-500 mb-5">This will permanently remove {client.name} and all their flow data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDelete(false)}
                className="border border-stone-200 text-stone-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
