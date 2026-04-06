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
  if (field.type === 'multiselect') {
    const selected: string[] = value ? JSON.parse(value) : []
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {field.options?.map(opt => {
          const isSelected = selected.includes(opt)
          return (
            <label
              key={opt}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                isSelected
                  ? 'bg-amber-50 border-amber-400 text-amber-900 font-medium'
                  : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {
                  const next = isSelected
                    ? selected.filter(s => s !== opt)
                    : [...selected, opt]
                  onChange(JSON.stringify(next))
                }}
                className="accent-amber-600 w-4 h-4"
              />
              {opt}
            </label>
          )
        })}
      </div>
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
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 relative"
          style={{
            background: isCompleted ? 'rgba(22,163,74,0.08)' : stage.colorSoft,
            color: isCompleted ? '#16A34A' : stage.color,
          }}
        >
          {stage.num}
          {isCompleted && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold">✓</span>
          )}
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
            </div>
          )}

          {/* Action slot — always renders even without data fields */}
          {actionSlot && actionSlotFullWidth && (
            <div>{actionSlot}</div>
          )}
          {actionSlot && !actionSlotFullWidth && stage.dataFields.length === 0 && (
            <div>{actionSlot}</div>
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
  // ALL hooks must be at the top — before any conditional returns
  const [generating, setGenerating] = useState(false)
  const [proposal, setProposal] = useState(fieldValues.get('proposal:generated_text') || '')

  useEffect(() => {
    const saved = fieldValues.get('proposal:generated_text')
    if (saved && !proposal) setProposal(saved)
  }, [fieldValues, proposal])

  const handleGenerateProposal = async () => {
    setGenerating(true)
    try {
      console.log('Starting proposal generation...')
      const payload = {
        clientName: client.name,
        brandName: client.brand,
        email: client.email,
        needs: fieldValues.get('discovery:what_they_need') || client.needs,
        transcriptNotes: fieldValues.get('discovery:transcript_link') || '',
        budgetRange: client.budget_range,
      }
      console.log('Payload:', JSON.stringify(payload).slice(0, 200))

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 55000) // 55s timeout

      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      console.log('Response status:', res.status)
      const text = await res.text()
      console.log('Response body (first 200):', text.slice(0, 200))

      let data
      try { data = JSON.parse(text) } catch {
        alert(`Invalid response from server: ${text.slice(0, 200)}`)
        setGenerating(false)
        return
      }

      if (!res.ok) {
        alert(`Proposal error (${res.status}): ${data.error || text.slice(0, 300)}`)
      } else if (data.proposal) {
        console.log('Proposal received, saving...')
        setProposal(data.proposal)
        await onSaveField('proposal', 'generated_text', data.proposal)
        await onSaveField('proposal', 'proposal_status', 'Draft')
        await onSaveField('proposal', 'email_type', 'proposal')
        console.log('Proposal saved successfully')
      } else {
        alert('No proposal in response: ' + text.slice(0, 300))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      console.error('Proposal generation failed:', msg)
      if (msg.includes('abort')) {
        alert('Proposal generation timed out. The AI is taking too long. Please try again.')
      } else {
        alert(`Failed to generate proposal: ${msg}`)
      }
    }
    setGenerating(false)
  }

  const handlePrepareThankYou = async () => {
    const thankYouText = `Hi ${client.name},\n\nThank you so much for taking the time to chat with us. We really enjoyed learning about ${client.brand || 'your business'}.\n\nAfter our conversation, we don't think we're the best fit for what you need right now — but we genuinely wish you all the best with your next steps.\n\nIf things change in the future, our door is always open.\n\nWarm regards,\nNyaki & Kopano\nClubSheIs`
    await Promise.all([
      onSaveField('proposal', 'thankyou_text', thankYouText),
      onSaveField('proposal', 'email_type', 'not-a-fit'),
      onSaveField('proposal', 'proposal_status', 'Draft'),
    ])
    await onAdvance()
    setTimeout(() => {
      document.getElementById('stage-proposal')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 500)
  }

  const handleOpenCalendar = () => {
    const followUp = new Date()
    followUp.setDate(followUp.getDate() + 14)
    followUp.setHours(9, 0, 0, 0)
    const startStr = followUp.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
    const endDate = new Date(followUp)
    endDate.setMinutes(endDate.getMinutes() + 30)
    const endStr = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
    const title = encodeURIComponent(`Follow Up: ${client.brand || client.name}`)
    const detailsRaw = `Follow-up with ${client.name}${client.email ? ` (${client.email})` : ''}${client.phone ? ` | ${client.phone}` : ''}`
    const details = encodeURIComponent(detailsRaw.slice(0, 500))
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&ctz=Africa/Johannesburg`
    window.open(url, '_blank')
  }

  if (!leadStatus) return null

  // Follow Up — open Google Calendar
  if (leadStatus.includes('Follow Up')) {
    return (
      <button
        onClick={handleOpenCalendar}
        className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
      >
        📅 Set 2-Week Follow-Up Reminder
      </button>
    )
  }

  // Not a Fit — prepare thank-you email in Stage 2
  if (leadStatus.includes('Not a Fit')) {
    return (
      <button
        onClick={handlePrepareThankYou}
        className="w-full bg-rose-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
      >
        Prepare Thank You Email →
      </button>
    )
  }

  // Good Fit — generate proposal button
  return (
    <div className="space-y-2">
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
    </div>
  )
}

// ── Awaiting Review actions — shows when proposal is accepted ──
function AwaitingReviewActions({
  client,
  fieldValues,
  onAdvance,
}: {
  client: Client
  fieldValues: Map<string, string>
  onAdvance: () => Promise<void>
}) {
  const [creating, setCreating] = useState(false)
  const [done, setDone] = useState(false)
  const proposalStatus = fieldValues.get('awaiting-review:proposal_status') || ''
  const isAccepted = proposalStatus === 'Accepted'
  const isDeclined = proposalStatus === 'Declined'
  const [archiving, setArchiving] = useState(false)
  const [archived, setArchived] = useState(false)

  const [driveResult, setDriveResult] = useState('')
  const [clickupResult, setClickupResult] = useState('')

  const handleAcceptAndSetup = async () => {
    setCreating(true)

    // 1. Try creating Google Drive folder
    try {
      const driveRes = await fetch('/api/create-client-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: client.name, brandName: client.brand }),
      })
      const driveData = await driveRes.json()
      if (driveRes.ok && driveData.folderLink) {
        setDriveResult(driveData.folderLink)
      } else {
        // Fallback: open the parent folder directly
        setDriveResult('https://drive.google.com/drive/folders/13opmLtB2CkiJQtKpxMPrtfza8C0FaJk6')
      }
    } catch {
      setDriveResult('https://drive.google.com/drive/folders/13opmLtB2CkiJQtKpxMPrtfza8C0FaJk6')
    }

    // 2. Try creating ClickUp task
    try {
      const cuRes = await fetch('/api/create-clickup-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.name,
          brandName: client.brand,
          email: client.email,
          phone: client.phone,
          package: client.package,
        }),
      })
      const cuData = await cuRes.json()
      if (cuRes.ok && cuData.taskUrl) {
        setClickupResult(cuData.taskUrl)
      } else {
        setClickupResult('https://app.clickup.com/90121487936/v/li/901215945043')
      }
    } catch {
      setClickupResult('https://app.clickup.com/90121487936/v/li/901215945043')
    }

    setDone(true)
    await onAdvance()
    setCreating(false)
  }

  if (!isAccepted && !isDeclined) return null

  if (isDeclined) {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500 text-lg">📋</span>
            <h4 className="text-sm font-bold text-red-800">Proposal Declined</h4>
          </div>
          <p className="text-sm text-red-700 mb-3">
            {client.brand || client.name} has declined the proposal. Archive the client to end the workflow.
          </p>
          {!archived ? (
            <button
              onClick={async () => {
                setArchiving(true)
                try {
                  const { supabase } = await import('@/lib/supabase')
                  await supabase.from('clients').update({
                    current_stage: 'archived',
                    lead_status: 'Declined'
                  }).eq('id', client.id)
                  setArchived(true)
                } catch (err) {
                  alert('Failed to archive: ' + (err instanceof Error ? err.message : 'Unknown error'))
                }
                setArchiving(false)
              }}
              disabled={archiving}
              className="w-full bg-red-600 text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {archiving ? 'Archiving...' : 'Archive Client & End Workflow'}
            </button>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-sm font-semibold text-red-700">✓ Client archived</p>
              <a href="/" className="inline-block text-sm text-red-600 underline hover:text-red-800">
                ← Back to Dashboard
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-600 text-lg">🎉</span>
          <h4 className="text-sm font-bold text-green-800">Proposal Accepted!</h4>
        </div>
        <p className="text-sm text-green-700 mb-3">
          {client.brand || client.name} has accepted the proposal. Clicking below will:
        </p>
        <ul className="text-sm text-green-700 space-y-1 mb-4">
          <li className="flex items-center gap-2">
            <span className="text-green-500">📁</span> Open Google Drive to create client folder
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✅</span> Create a client task in ClickUp
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">→</span> Move to Client Onboarding
          </li>
        </ul>
        {!done ? (
          <button
            onClick={handleAcceptAndSetup}
            disabled={creating}
            className="w-full bg-[#16A34A] text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {creating ? 'Setting up client...' : 'Accept & Set Up Client →'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-green-700 text-center">✓ Client set up complete</p>
            <div className="flex gap-3">
              {driveResult && (
                <a href={driveResult} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-center bg-white border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors">
                  📁 Open Drive Folder
                </a>
              )}
              {clickupResult && (
                <a href={clickupResult} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-center bg-white border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors">
                  ✅ Open ClickUp Task
                </a>
              )}
            </div>
            <button
              onClick={() => {
                const nextStage = document.getElementById('stage-onboarding')
                if (nextStage) nextStage.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="w-full bg-[#16A34A] text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer"
            >
              Continue to Client Onboarding →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Onboarding Actions — Welcome email + booking link ──
function OnboardingActions({
  client,
  fieldValues,
  onSaveField,
}: {
  client: Client
  fieldValues: Map<string, string>
  onSaveField: (stageKey: string, fieldKey: string, value: string) => void
}) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(fieldValues.get('onboarding:welcome_email_status') === 'Sent' || fieldValues.get('onboarding:welcome_email_status') === 'Client Replied')
  const [creatingSubaccount, setCreatingSubaccount] = useState(false)
  const [subaccountCreated, setSubaccountCreated] = useState(!!fieldValues.get('onboarding:ghl_location_id'))
  const [ghlUrl, setGhlUrl] = useState(fieldValues.get('onboarding:ghl_url') || '')

  const handleSendWelcome = async () => {
    if (!client.email) {
      alert('Client email is missing. Please edit the client and add their email first.')
      return
    }
    setSending(true)
    try {
      const pkgLabel = client.package?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'client'
      const res = await fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone,
          brandName: client.brand,
          packageName: pkgLabel,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(`Failed: ${data.error}`)
      } else {
        setSent(true)
        await onSaveField('onboarding', 'welcome_email_status', 'Sent')
        if (data.warning) {
          alert(`Contact added to Ghutte but workflow may need manual trigger: ${data.warning}`)
        } else {
          alert(`Welcome workflow triggered for ${client.name}!`)
        }
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Network error'}`)
    }
    setSending(false)
  }

  const handleCreateSubaccount = async () => {
    setCreatingSubaccount(true)
    try {
      const res = await fetch('/api/create-ghl-subaccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone,
          brandName: client.brand,
          website: client.website,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(`Failed: ${data.error}`)
      } else {
        setSubaccountCreated(true)
        setGhlUrl(data.ghlUrl || '')
        await onSaveField('onboarding', 'ghl_location_id', data.locationId)
        await onSaveField('onboarding', 'ghl_url', data.ghlUrl || '')
        alert(`Ghutte account "${data.locationName}" created!`)
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Network error'}`)
    }
    setCreatingSubaccount(false)
  }

  return (
    <div className="space-y-3">
      {/* Step 1: Create Ghutte Account */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-bold text-blue-800">1. Create Ghutte Account</h4>
        <p className="text-sm text-blue-700">
          Create a new Ghutte account for {client.brand || client.name}. This gives them their own CRM, pipeline, and automations.
        </p>
        {!subaccountCreated ? (
          <button
            onClick={handleCreateSubaccount}
            disabled={creatingSubaccount}
            className="w-full bg-blue-600 text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {creatingSubaccount ? 'Creating sub-account...' : `Create Ghutte Account for ${client.brand || client.name} →`}
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-700">✓ Sub-account created</p>
            {ghlUrl && (
              <a href={ghlUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 underline hover:text-blue-800">
                Open in Ghutte →
              </a>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Trigger Welcome Workflow */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-bold text-green-800">2. Trigger Welcome Workflow</h4>
        <p className="text-sm text-green-700">
          Add {client.name} as a contact in your Ghutte and trigger the welcome email workflow.
        </p>
        {!sent ? (
          <button
            onClick={handleSendWelcome}
            disabled={sending}
            className="w-full bg-[#16A34A] text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {sending ? 'Triggering workflow...' : `Trigger Welcome Workflow for ${client.name} →`}
          </button>
        ) : (
          <div className="text-center">
            <p className="text-sm font-semibold text-green-700">✓ Welcome workflow triggered — email sent via Ghutte</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Strategy Session Actions — Sequential document pipeline ──
function StrategyActions({
  client,
  fieldValues,
  onSaveField,
}: {
  client: Client
  fieldValues: Map<string, string>
  onSaveField: (stageKey: string, fieldKey: string, value: string) => void
}) {
  const transcript = fieldValues.get('strategy:session_transcript') || ''

  // Document states from saved data
  const savedProfile = fieldValues.get('strategy:client_profile_text') || ''
  const savedBible = fieldValues.get('strategy:research_bible_text') || ''
  const savedVoice = fieldValues.get('strategy:brand_voice_text') || ''
  const profileApproved = fieldValues.get('strategy:client_profile_approved') === 'true'
  const bibleApproved = fieldValues.get('strategy:research_bible_approved') === 'true'
  const voiceApproved = fieldValues.get('strategy:brand_voice_approved') === 'true'
  const allUploaded = fieldValues.get('strategy:docs_uploaded') === 'true'

  // Local editing states
  const [generating, setGenerating] = useState('')
  const [editingDoc, setEditingDoc] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [uploading, setUploading] = useState(false)

  // Current content (use saved)
  const profileText = savedProfile
  const bibleText = savedBible
  const voiceText = savedVoice

  if (!transcript) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-700">
          <strong>Paste the strategy session transcript above</strong> to unlock the document pipeline.
        </p>
      </div>
    )
  }

  const handleGenerate = async (docType: string) => {
    setGenerating(docType)
    try {
      const res = await fetch('/api/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          clientName: client.name,
          brandName: client.brand,
          transcript,
          clientProfile: profileText,
          researchBible: bibleText,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        let errMsg = errText
        try { errMsg = JSON.parse(errText).error } catch {}
        alert(`Error: ${errMsg}`)
        setGenerating('')
        return
      }

      // Read raw Anthropic SSE stream
      const reader = res.body?.getReader()
      if (!reader) { alert('No response stream'); setGenerating(''); return }
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''
      let stopReason = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              // Raw Anthropic format: content_block_delta with delta.text
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullText += parsed.delta.text
              }
              // Detect truncation
              if (parsed.type === 'message_delta' && parsed.delta?.stop_reason) {
                stopReason = parsed.delta.stop_reason
              }
            } catch {}
          }
        }
      }
      // Process remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        const data = buffer.trim().slice(6)
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullText += parsed.delta.text
          }
          if (parsed.type === 'message_delta' && parsed.delta?.stop_reason) {
            stopReason = parsed.delta.stop_reason
          }
        } catch {}
      }

      if (stopReason === 'max_tokens') {
        fullText += '\n\n⚠️ OUTPUT WAS TRUNCATED — document exceeded token limit. Please regenerate or edit manually.'
      }

      if (fullText) {
        const fieldKey = docType === 'client-profile' ? 'client_profile_text'
          : docType === 'research-bible' ? 'research_bible_text'
          : 'brand_voice_text'
        await onSaveField('strategy', fieldKey, fullText)
      } else {
        alert('Error: No content was generated. Please try again.')
      }
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : 'Network error'}. Please try again.`)
    }
    setGenerating('')
  }

  const [savingToDrive, setSavingToDrive] = useState('')

  const handleApprove = async (docType: string) => {
    const key = docType === 'client-profile' ? 'client_profile_approved'
      : docType === 'research-bible' ? 'research_bible_approved'
      : 'brand_voice_approved'
    const docName = docType === 'client-profile' ? 'Client Profile'
      : docType === 'research-bible' ? 'Research Bible'
      : 'Brand Voice'
    const textKey = docType === 'client-profile' ? 'client_profile_text'
      : docType === 'research-bible' ? 'research_bible_text'
      : 'brand_voice_text'
    const text = fieldValues.get(`strategy:${textKey}`) || ''
    const docTitle = `${client.name}_${docName.replace(/\s+/g, '')}`
    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL

    // Mark as approved
    await onSaveField('strategy', key, 'true')

    if (!scriptUrl) {
      try { await navigator.clipboard.writeText(text) } catch {}
      window.open('https://docs.google.com/document/create', '_blank')
      alert(`Content copied to clipboard — paste into the new doc.\nName it: ${docTitle}`)
      return
    }

    // Submit a hidden form to Apps Script (no CORS issues with form POST)
    // The Apps Script creates the doc and redirects the new tab to it
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = scriptUrl
    form.target = '_blank'

    const titleInput = document.createElement('input')
    titleInput.type = 'hidden'
    titleInput.name = 'title'
    titleInput.value = docTitle
    form.appendChild(titleInput)

    const contentInput = document.createElement('input')
    contentInput.type = 'hidden'
    contentInput.name = 'content'
    contentInput.value = text
    form.appendChild(contentInput)

    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
  }

  const handleUnapprove = async (docType: string) => {
    const key = docType === 'client-profile' ? 'client_profile_approved'
      : docType === 'research-bible' ? 'research_bible_approved'
      : 'brand_voice_approved'
    await onSaveField('strategy', key, 'false')
  }

  const handleEdit = (docType: string, text: string) => {
    setEditingDoc(docType)
    setEditText(text)
  }

  const handleSaveEdit = async () => {
    if (!editingDoc) return
    const fieldKey = editingDoc === 'client-profile' ? 'client_profile_text'
      : editingDoc === 'research-bible' ? 'research_bible_text'
      : 'brand_voice_text'
    await onSaveField('strategy', fieldKey, editText)
    setEditingDoc(null)
    setEditText('')
  }

  const handleUploadAll = async () => {
    setUploading(true)
    // For now, mark as uploaded — Drive + ClickUp integration can be added
    await onSaveField('strategy', 'docs_uploaded', 'true')
    setUploading(false)
    alert('Documents marked as uploaded. Open Google Drive and ClickUp to link them.')
  }

  const profileDocUrl = fieldValues.get('strategy:client_profile_doc_url') || ''
  const bibleDocUrl = fieldValues.get('strategy:research_bible_doc_url') || ''
  const voiceDocUrl = fieldValues.get('strategy:brand_voice_doc_url') || ''

  const DOCS = [
    {
      key: 'client-profile',
      title: 'Client Profile',
      description: 'Full 8-section profile: overview, audience, voice, offers, content, visual identity, history, and social presence.',
      text: profileText,
      approved: profileApproved,
      canGenerate: true,
      color: 'purple',
      docUrl: profileDocUrl,
    },
    {
      key: 'research-bible',
      title: 'Research Bible',
      description: '7-part research bible: intake, market research, Schwartz analysis, competitors, content intelligence.',
      text: bibleText,
      approved: bibleApproved,
      canGenerate: profileApproved,
      color: 'blue',
      docUrl: bibleDocUrl,
    },
    {
      key: 'brand-voice',
      title: 'Brand Voice',
      description: 'Tone, language patterns, do\'s and don\'ts, sample copy.',
      text: voiceText,
      approved: voiceApproved,
      canGenerate: bibleApproved,
      color: 'amber',
      docUrl: voiceDocUrl,
    },
  ]

  return (
    <div className="space-y-3">
      {/* Document Pipeline */}
      {DOCS.map((doc, idx) => {
        const isGenerating = generating === doc.key
        const isLocked = !doc.canGenerate
        const hasContent = !!doc.text
        const isEditing = editingDoc === doc.key

        return (
          <div key={doc.key} className={`rounded-lg border p-4 space-y-3 ${
            doc.approved ? 'bg-green-50 border-green-200' :
            isLocked ? 'bg-stone-50 border-stone-200 opacity-60' :
            'bg-white border-purple-200'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  doc.approved ? 'bg-green-500 text-white' :
                  hasContent ? 'bg-purple-500 text-white' :
                  'bg-stone-300 text-white'
                }`}>
                  {doc.approved ? '✓' : idx + 1}
                </span>
                <h4 className="text-sm font-bold text-stone-800">{doc.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                {doc.approved && doc.docUrl && (
                  <a href={doc.docUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:text-blue-800 underline">
                    Open in Drive
                  </a>
                )}
                {doc.approved && <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded">APPROVED</span>}
              </div>
              {isLocked && <span className="text-xs text-stone-400">Locked — approve previous doc first</span>}
            </div>
            <p className="text-xs text-stone-500">{doc.description}</p>

            {/* Actions */}
            {!isLocked && !hasContent && !isGenerating && (
              <button
                onClick={() => handleGenerate(doc.key)}
                className="w-full bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors cursor-pointer"
              >
                Generate {doc.title}
              </button>
            )}
            {isGenerating && (
              <div className="text-center py-3">
                <p className="text-sm text-purple-600 animate-pulse">Generating {doc.title}...</p>
              </div>
            )}

            {/* Content display */}
            {hasContent && !isEditing && (
              <div className="space-y-2">
                <div className="bg-white border border-stone-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed">{
                    doc.text.split('\n').map((line, i) => {
                      if (line.includes('GAP:') || line.includes('[ASSUMPTION:')) {
                        return <span key={i} className="bg-yellow-200 text-yellow-900 px-1 rounded">{line}{'\n'}</span>
                      }
                      return <span key={i}>{line}{'\n'}</span>
                    })
                  }</pre>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(doc.key, doc.text)}
                    className="flex-1 bg-white border border-stone-300 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleGenerate(doc.key)}
                    disabled={isGenerating}
                    className="flex-1 bg-white border border-purple-300 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating ? 'Generating...' : 'Regenerate'}
                  </button>
                  {!doc.approved ? (
                    <button
                      onClick={() => handleApprove(doc.key)}
                      disabled={savingToDrive === doc.key}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {savingToDrive === doc.key ? 'Creating Google Doc...' : 'Approve & Save to Drive ✓'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnapprove(doc.key)}
                      className="flex-1 bg-white border border-amber-300 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      Unapprove
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Editing */}
            {isEditing && (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full border border-purple-300 rounded-lg p-3 text-xs text-stone-700 font-sans leading-relaxed min-h-[200px] focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingDoc(null); setEditText('') }}
                    className="flex-1 bg-white border border-stone-300 text-stone-600 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* All Approved */}
      {profileApproved && bibleApproved && voiceApproved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-sm font-semibold text-green-700">✓ All documents approved — confirm all are saved to Google Drive, then move to production.</p>
        </div>
      )}
    </div>
  )
}

// ── Implementation Plan Actions — Confirm funnel strategy + add extras ──
function ImplementationPlanActions({
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
  const [customInput, setCustomInput] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Load funnel strategy elements and selections
  const funnelStrategyJson = fieldValues.get('funnel-strategy:funnel_elements_json') || ''
  const funnelSelectionsRaw = fieldValues.get('funnel-strategy:funnel_selections') || '[]'
  // Load any extra implementation-only elements
  const implExtrasRaw = fieldValues.get('implementation-plan:extra_elements') || '[]'

  let allStrategyElements: FunnelElement[] = []
  try { if (funnelStrategyJson) allStrategyElements = JSON.parse(funnelStrategyJson) } catch {}
  let selectedIndices: number[] = []
  try { selectedIndices = JSON.parse(funnelSelectionsRaw) } catch {}
  let extraElements: { type: string; topic: string }[] = []
  try { extraElements = JSON.parse(implExtrasRaw) } catch {}

  const selectedElements = selectedIndices.map(i => allStrategyElements[i]).filter(Boolean)

  const handleAddExtra = async () => {
    const text = customInput.trim()
    if (!text) return
    let type = 'Custom'
    let topic = text
    const colonIdx = text.indexOf(':')
    if (colonIdx > 0 && colonIdx < 30) {
      type = text.slice(0, colonIdx).trim()
      topic = text.slice(colonIdx + 1).trim()
    }
    const updated = [...extraElements, { type, topic }]
    await onSaveField('implementation-plan', 'extra_elements', JSON.stringify(updated))
    setCustomInput('')
    setShowAddForm(false)
  }

  const handleRemoveExtra = async (idx: number) => {
    const updated = extraElements.filter((_, i) => i !== idx)
    await onSaveField('implementation-plan', 'extra_elements', JSON.stringify(updated))
  }

  const totalElements = selectedElements.length + extraElements.length

  // Group strategy elements by funnel stage for display
  const stageOrder = ['awareness', 'engagement', 'conversion', 'delivery', 'retention']

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Production Checklist — {totalElements} elements</h4>
        <p className="text-xs text-amber-600">These are the marketing assets we build — pages and email sequences to sell and market the client's product. The client creates the actual product (course, guide, masterclass, etc.).</p>
      </div>

      {/* Strategy elements by stage */}
      {selectedElements.length > 0 && (
        <div className="space-y-3">
          {stageOrder.map(stage => {
            const stageItems = selectedElements.filter(el => el.funnel_stage === stage)
            if (stageItems.length === 0) return null
            const stageInfo = STAGE_LABELS[stage] || { label: stage, color: 'text-stone-700', bg: 'bg-stone-50', border: 'border-stone-200' }
            return (
              <div key={stage}>
                <div className={`text-xs font-bold uppercase tracking-wider ${stageInfo.color} mb-1.5 flex items-center gap-2`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${stageInfo.bg} ${stageInfo.border} border`} />
                  {stageInfo.label}
                </div>
                <div className="space-y-1.5">
                  {stageItems.map((el, i) => {
                    // Determine what we build vs what client builds
                    const isProduct = ['course', 'masterclass', 'ebook', 'guide', 'toolkit', 'template', 'cheat sheet', 'checklist', 'mini-course', 'video series', 'workshop', 'challenge', 'downloadable'].some(
                      t => el.type.toLowerCase().includes(t)
                    )
                    return (
                      <div key={i} className={`rounded-lg border p-3 ${stageInfo.bg} ${stageInfo.border}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-green-500 text-sm">✓</span>
                          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{el.type}</span>
                        </div>
                        <p className="text-sm font-semibold text-stone-800 mt-0.5 ml-6">{el.topic}</p>
                        <p className="text-xs text-stone-500 mt-0.5 ml-6">{el.description}</p>

                        {/* What we build */}
                        <div className="ml-6 mt-2 space-y-1.5">
                          <div className="bg-green-50 border border-green-200 rounded-md px-3 py-1.5">
                            <span className="text-xs font-bold text-green-600 uppercase tracking-wider">We build: </span>
                            <span className="text-xs text-green-700">
                              {isProduct ? `Landing page, sales copy & email sequence for the ${el.type.toLowerCase()}` : `${el.type} page & sales copy`}
                            </span>
                          </div>
                          {isProduct && (
                            <div className="bg-stone-50 border border-stone-200 rounded-md px-3 py-1.5">
                              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Client builds: </span>
                              <span className="text-xs text-stone-600">The actual {el.type.toLowerCase()} content</span>
                            </div>
                          )}
                          {el.email_note && (
                            <div className="bg-purple-50 border border-purple-200 rounded-md px-3 py-1.5">
                              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Email sequence: </span>
                              <span className="text-xs text-purple-700">{el.email_note}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedElements.length === 0 && (
        <div className="text-center py-4 text-stone-400 text-sm">
          No elements from Funnel Strategy. Go back and generate/confirm the strategy first, or add elements below.
        </div>
      )}

      {/* Extra implementation elements */}
      {extraElements.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1.5 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-50 border-amber-200 border" />
            Additional Elements
          </div>
          <div className="space-y-1.5">
            {extraElements.map((el, i) => (
              <div key={i} className="rounded-lg border p-3 bg-amber-50 border-amber-200 flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-sm">+</span>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{el.type}</span>
                  <span className="text-sm font-semibold text-stone-800">{el.topic}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveExtra(i)}
                  className="w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center hover:bg-red-200"
                  title="Remove"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add more elements */}
      {showAddForm ? (
        <div className="flex gap-2 items-start">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddExtra() }}
            placeholder="e.g. Check Out Page: Premium Coaching Package or Thank You Page: Post-Purchase Welcome"
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 bg-white"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddExtra}
            className="bg-amber-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 cursor-pointer whitespace-nowrap"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setShowAddForm(false); setCustomInput('') }}
            className="bg-white border border-stone-300 text-stone-500 px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full border border-dashed border-stone-300 rounded-lg py-2.5 text-sm text-stone-400 hover:text-stone-600 hover:border-stone-400 transition-colors cursor-pointer"
        >
          + Add element not in strategy
        </button>
      )}

      {/* Confirm button */}
      {totalElements > 0 && (
        <button
          type="button"
          onClick={onAdvance}
          className="w-full bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer"
        >
          Confirm Implementation Plan & Move to Funnel Map →
        </button>
      )}
    </div>
  )
}

// ── Funnel Map Actions — Decision tree customer journey ──
type FunnelMapNode = { id: string; type: string; label: string; sublabel: string; color: string }
type FunnelMapEdge = { from: string; to: string; label?: string; type: 'yes' | 'no' | 'default' }
type FunnelMapData = { nodes: FunnelMapNode[]; edges: FunnelMapEdge[] }

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800' },
  green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-800' },
  red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-800' },
}
const NODE_ICONS: Record<string, string> = { traffic: '🌐', page: '📄', email: '✉️', decision: '🔀', action: '⚡' }
const EDGE_COLORS: Record<string, string> = { yes: 'text-green-600', no: 'text-red-500', default: 'text-stone-400' }
const EDGE_BORDER: Record<string, string> = { yes: 'border-green-400', no: 'border-red-300', default: 'border-stone-300' }

// Build layered tree from nodes+edges for rendering
function buildTreeLayers(data: FunnelMapData): { layers: { node: FunnelMapNode; edges: { edge: FunnelMapEdge; targetNode: FunnelMapNode }[] }[][] } {
  const nodeMap = new Map(data.nodes.map(n => [n.id, n]))
  const childEdges = new Map<string, FunnelMapEdge[]>()
  const hasParent = new Set<string>()
  for (const e of data.edges) {
    if (!childEdges.has(e.from)) childEdges.set(e.from, [])
    childEdges.get(e.from)!.push(e)
    hasParent.add(e.to)
  }
  // Find roots (nodes with no incoming edges)
  const roots = data.nodes.filter(n => !hasParent.has(n.id))
  if (roots.length === 0 && data.nodes.length > 0) roots.push(data.nodes[0])

  const layers: { node: FunnelMapNode; edges: { edge: FunnelMapEdge; targetNode: FunnelMapNode }[] }[][] = []
  let currentLevel = roots.map(r => r.id)
  const visited = new Set<string>()

  while (currentLevel.length > 0) {
    const layerItems: { node: FunnelMapNode; edges: { edge: FunnelMapEdge; targetNode: FunnelMapNode }[] }[] = []
    const nextLevel: string[] = []
    for (const nid of currentLevel) {
      if (visited.has(nid)) continue
      visited.add(nid)
      const node = nodeMap.get(nid)
      if (!node) continue
      const outEdges = (childEdges.get(nid) || [])
        .map(e => ({ edge: e, targetNode: nodeMap.get(e.to)! }))
        .filter(x => x.targetNode)
      layerItems.push({ node, edges: outEdges })
      for (const oe of outEdges) {
        if (!visited.has(oe.targetNode.id)) nextLevel.push(oe.targetNode.id)
      }
    }
    if (layerItems.length > 0) layers.push(layerItems)
    currentLevel = nextLevel
  }
  return { layers }
}

function FunnelMapActions({
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
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editJson, setEditJson] = useState('')

  const savedMapRaw = fieldValues.get('funnel-map:funnel_map_json') || ''
  let mapData: FunnelMapData | null = null
  try {
    if (savedMapRaw) {
      const raw = JSON.parse(savedMapRaw)
      // Only accept new decision tree format (nodes+edges), ignore old rows format
      if (raw.nodes && Array.isArray(raw.nodes) && raw.edges && Array.isArray(raw.edges)) {
        mapData = raw
      }
    }
  } catch {}

  // Get funnel elements for context
  const funnelStrategyJson = fieldValues.get('funnel-strategy:funnel_elements_json') || ''
  const funnelSelectionsRaw = fieldValues.get('funnel-strategy:funnel_selections') || '[]'
  const implExtrasRaw = fieldValues.get('implementation-plan:extra_elements') || '[]'
  const profileText = fieldValues.get('strategy:client_profile_text') || ''

  let funnelElementsList: string[] = []
  try {
    const allElements: FunnelElement[] = funnelStrategyJson ? JSON.parse(funnelStrategyJson) : []
    const selectedIndices: number[] = JSON.parse(funnelSelectionsRaw)
    funnelElementsList = selectedIndices.map(i => allElements[i]).filter(Boolean).map(el => `${el.type}: ${el.topic}`)
  } catch {}
  try {
    const extras: { type: string; topic: string }[] = JSON.parse(implExtrasRaw)
    for (const ex of extras) funnelElementsList.push(`${ex.type}: ${ex.topic}`)
  } catch {}

  const handleGenerate = async () => {
    if (funnelElementsList.length === 0) {
      alert('No funnel elements found. Complete the Funnel Strategy and Implementation Plan first.')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'funnel-map',
          clientName: client.name,
          brandName: client.brand,
          funnelElements: funnelElementsList.join('\n- '),
          clientProfile: profileText,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        let errMsg = errText
        try { errMsg = JSON.parse(errText).error } catch {}
        alert(`Error: ${errMsg}`)
        setGenerating(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) { alert('No response stream'); setGenerating(false); return }
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) fullText += parsed.delta.text
            } catch {}
          }
        }
      }
      if (buffer.trim().startsWith('data: ')) {
        try {
          const parsed = JSON.parse(buffer.trim().slice(6))
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) fullText += parsed.delta.text
        } catch {}
      }

      if (fullText) {
        let jsonStr = fullText.trim()
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        try {
          const parsed = JSON.parse(jsonStr)
          if (parsed.nodes && parsed.edges) {
            await onSaveField('funnel-map', 'funnel_map_json', JSON.stringify(parsed))
          } else {
            alert('AI response was not a valid funnel map. Please try again.')
          }
        } catch {
          console.error('Failed to parse funnel map JSON:', jsonStr.slice(0, 200))
          alert('Could not parse funnel map. Please try regenerating.')
        }
      }
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : 'Network error'}`)
    }
    setGenerating(false)
  }

  const handleEdit = () => {
    setEditJson(JSON.stringify(mapData, null, 2))
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    try {
      const parsed = JSON.parse(editJson)
      if (parsed.nodes && parsed.edges) {
        await onSaveField('funnel-map', 'funnel_map_json', JSON.stringify(parsed))
        setEditing(false)
      } else {
        alert('Invalid format — needs "nodes" and "edges" fields.')
      }
    } catch {
      alert('Invalid JSON. Please fix the syntax and try again.')
    }
  }

  const handleDownloadPDF = () => {
    const el = document.getElementById('funnel-map-render')
    if (!el) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) { alert('Please allow popups to download the PDF.'); return }
    printWindow.document.write(`
      <html><head><title>${client.name} — Funnel Map</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; background: white; }
        .map-title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
        .map-subtitle { font-size: 14px; color: #666; margin-bottom: 30px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="map-title">${client.name} — Funnel Map</div>
      <div class="map-subtitle">${client.brand || ''} • Customer Journey Decision Tree</div>
      ${el.innerHTML}
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
      </body></html>
    `)
    printWindow.document.close()
  }

  // Render the decision tree
  const renderTree = () => {
    if (!mapData) return null
    const { layers } = buildTreeLayers(mapData)

    return (
      <div className="space-y-1">
        {layers.map((layer, li) => (
          <div key={li}>
            {/* Nodes in this layer */}
            <div className="flex justify-center gap-4 flex-wrap">
              {layer.map(({ node, edges }) => {
                const colors = NODE_COLORS[node.color] || NODE_COLORS.purple
                const icon = NODE_ICONS[node.type] || '📄'
                const isDecision = node.type === 'decision'
                return (
                  <div key={node.id} className="flex flex-col items-center">
                    {/* The node */}
                    <div className={`${colors.bg} ${colors.border} border-2 ${isDecision ? 'rotate-0 rounded-lg border-dashed' : 'rounded-xl'} px-4 py-3 min-w-[160px] max-w-[200px] text-center shadow-sm`}>
                      <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">{icon} {node.type}</div>
                      <div className={`text-sm font-bold ${colors.text} mt-0.5 leading-tight`}>{node.label}</div>
                      {node.sublabel && <div className="text-xs text-stone-500 mt-0.5 leading-tight">{node.sublabel}</div>}
                    </div>

                    {/* Edges going out from this node */}
                    {edges.length > 0 && (
                      <div className={`flex ${edges.length > 1 ? 'gap-8' : ''} mt-1`}>
                        {edges.map((oe, ei) => (
                          <div key={ei} className="flex flex-col items-center">
                            <div className={`w-0.5 h-4 ${EDGE_BORDER[oe.edge.type] || 'border-stone-300'} border-l-2`} />
                            {oe.edge.label && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                oe.edge.type === 'yes' ? 'bg-green-100 text-green-700' :
                                oe.edge.type === 'no' ? 'bg-red-100 text-red-600' :
                                'bg-stone-100 text-stone-500'
                              }`}>
                                {oe.edge.label}
                              </span>
                            )}
                            <div className={`text-lg ${EDGE_COLORS[oe.edge.type] || 'text-stone-400'}`}>↓</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Generate / Regenerate */}
      {!generating && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={funnelElementsList.length === 0}
          className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            mapData ? 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50' : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {mapData ? 'Regenerate Funnel Map' : funnelElementsList.length === 0 ? 'Complete Implementation Plan first' : 'Generate Funnel Map'}
        </button>
      )}
      {generating && (
        <div className="text-center py-4">
          <p className="text-sm text-purple-600 animate-pulse">Building your decision tree funnel map...</p>
        </div>
      )}

      {/* Visual decision tree render */}
      {mapData && !editing && (
        <div className="space-y-3">
          <div id="funnel-map-render" className="bg-white border border-purple-200 rounded-xl p-6 overflow-x-auto">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-stone-800">Customer Journey Decision Tree</h3>
              <p className="text-xs text-stone-400">Each decision point splits based on the customer&apos;s action</p>
            </div>
            {renderTree()}
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-stone-100">
              <span className="text-[10px] text-stone-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Yes path</span>
              <span className="text-[10px] text-stone-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> No path</span>
              <span className="text-[10px] text-stone-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-stone-300 inline-block" /> Sequential</span>
              <span className="text-[10px] text-stone-400 flex items-center gap-1">🔀 Decision point</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={handleEdit} className="flex-1 bg-white border border-stone-300 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-50 cursor-pointer">
              Edit Map
            </button>
            <button onClick={handleGenerate} disabled={generating} className="flex-1 bg-white border border-purple-300 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-50 cursor-pointer disabled:opacity-50">
              Regenerate
            </button>
            <button onClick={handleDownloadPDF} className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 cursor-pointer">
              Download PDF
            </button>
          </div>

          {/* Confirm */}
          <button
            type="button"
            onClick={onAdvance}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer"
          >
            Confirm Funnel Map & Move to Copy Bible →
          </button>
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <div className="space-y-2">
          <p className="text-xs text-stone-500">Edit the JSON structure below. &quot;nodes&quot; are the steps and &quot;edges&quot; connect them. Edge type &quot;yes&quot;/&quot;no&quot; creates decision branches.</p>
          <textarea
            value={editJson}
            onChange={(e) => setEditJson(e.target.value)}
            className="w-full border border-purple-300 rounded-lg p-3 text-xs text-stone-700 font-mono leading-relaxed min-h-[300px] focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 bg-white border border-stone-300 text-stone-600 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
              Cancel
            </button>
            <button onClick={handleSaveEdit} className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 cursor-pointer">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Copy Bible — Shared streaming helper ──
async function streamGenerate(body: Record<string, unknown>): Promise<{ text: string; truncated: boolean }> {
  const res = await fetch('/api/generate-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    let errMsg = errText
    try { errMsg = JSON.parse(errText).error } catch {}
    throw new Error(errMsg)
  }
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response stream')
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''
  let stopReason = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) fullText += parsed.delta.text
          if (parsed.type === 'message_delta' && parsed.delta?.stop_reason) stopReason = parsed.delta.stop_reason
        } catch {}
      }
    }
  }
  if (buffer.trim().startsWith('data: ')) {
    try {
      const parsed = JSON.parse(buffer.trim().slice(6))
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) fullText += parsed.delta.text
      if (parsed.type === 'message_delta' && parsed.delta?.stop_reason) stopReason = parsed.delta.stop_reason
    } catch {}
  }
  return { text: fullText, truncated: stopReason === 'max_tokens' }
}

// ── Shared: Save to Google Drive helper ──
function saveToDrive(title: string, content: string) {
  const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL
  if (scriptUrl) {
    try {
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = scriptUrl
      form.target = '_blank'
      const addField = (name: string, value: string) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = name
        input.value = value
        form.appendChild(input)
      }
      addField('title', title)
      addField('content', content)
      document.body.appendChild(form)
      form.submit()
      document.body.removeChild(form)
      return
    } catch {}
  }
  navigator.clipboard.writeText(content)
  window.open('https://docs.google.com/document/create', '_blank')
  alert(`Content copied to clipboard — paste it into the new doc.\nName it: ${title}`)
}

// ── Copy Sub-Section (Page Copy or Email Sequence) ──
function CopySubSection({
  type,
  label,
  icon,
  color,
  index,
  elementFull,
  client,
  fieldValues,
  onSaveField,
  profileText,
  bibleText,
  voiceText,
  transcript,
}: {
  type: 'page' | 'email'
  label: string
  icon: string
  color: { bg: string; border: string; text: string; buttonBg: string; buttonHover: string }
  index: number
  elementFull: string
  client: Client
  fieldValues: Map<string, string>
  onSaveField: (stageKey: string, fieldKey: string, value: string) => void
  profileText: string
  bibleText: string
  voiceText: string
  transcript: string
}) {
  const [generating, setGenerating] = useState(false)
  const [editingDoc, setEditingDoc] = useState(false)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  const textKey = `element_${index}_${type}_text`
  const notesKey = `element_${index}_${type}_notes`
  const approvedKey = `element_${index}_${type}_approved`
  const copyText = fieldValues.get(`copy-bible:${textKey}`) || ''
  const userNotes = fieldValues.get(`copy-bible:${notesKey}`) || ''
  const isApproved = fieldValues.get(`copy-bible:${approvedKey}`) === 'true'

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await streamGenerate({
        documentType: type === 'page' ? 'copy-element-page' : 'copy-element-email',
        clientName: client.name,
        brandName: client.brand,
        transcript,
        clientProfile: profileText,
        researchBible: bibleText,
        brandVoice: voiceText,
        funnelElements: elementFull,
        userNotes: userNotes || undefined,
      })
      let text = result.text
      if (result.truncated) text += '\n\n⚠️ OUTPUT WAS TRUNCATED — please regenerate or edit manually.'
      if (text) {
        await onSaveField('copy-bible', textKey, text)
        if (isApproved) await onSaveField('copy-bible', approvedKey, 'false')
      } else {
        alert('No content generated. Please try again.')
      }
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : 'Network error'}`)
    }
    setGenerating(false)
  }

  const handleApprove = async () => {
    setSaving(true)
    const safeLabel = label.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_')
    saveToDrive(`${client.name}_${type === 'page' ? 'PageCopy' : 'Emails'}_${safeLabel}`, copyText)
    await onSaveField('copy-bible', approvedKey, 'true')
    setSaving(false)
  }

  return (
    <div className={`rounded-lg border ${color.border} ${isApproved ? 'bg-green-50/30' : color.bg} p-3 space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className={`text-xs font-bold uppercase tracking-wider ${color.text}`}>{label}</span>
        </div>
        {isApproved && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">APPROVED</span>}
        {copyText && !isApproved && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">DRAFT</span>}
      </div>

      {/* Notes */}
      <textarea
        value={userNotes}
        onChange={(e) => onSaveField('copy-bible', notesKey, e.target.value)}
        placeholder={`Your notes for the ${type === 'page' ? 'page copy' : 'email sequence'}...`}
        className="w-full border border-stone-200 rounded-lg p-2 text-xs text-stone-700 leading-relaxed min-h-[50px] focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-stone-400 resize-y"
      />

      {/* Generate */}
      {!generating && (
        <button onClick={handleGenerate} className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
          copyText ? `bg-white border ${color.border} ${color.text} hover:${color.bg}` : `${color.buttonBg} text-white ${color.buttonHover}`
        }`}>
          {copyText ? 'Regenerate' : 'Generate'}
        </button>
      )}
      {generating && <p className={`text-xs ${color.text} animate-pulse text-center py-2`}>Generating {type === 'page' ? 'page copy' : 'email sequence'}...</p>}

      {/* Content */}
      {copyText && !editingDoc && (
        <div className="space-y-2">
          <div className="bg-white border border-stone-200 rounded-lg p-3 max-h-64 overflow-y-auto">
            <pre className="text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed">{
              copyText.split('\n').map((line, i) => {
                if (line.includes('GAP:') || line.includes('[ASSUMPTION:')) return <span key={i} className="bg-yellow-200 text-yellow-900 px-1 rounded">{line}{'\n'}</span>
                return <span key={i}>{line}{'\n'}</span>
              })
            }</pre>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setEditText(copyText); setEditingDoc(true) }} className="flex-1 bg-white border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-50 cursor-pointer">Edit</button>
            <button onClick={handleGenerate} disabled={generating} className={`flex-1 bg-white border ${color.border} ${color.text} px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50`}>Regenerate</button>
            {!isApproved ? (
              <button onClick={handleApprove} disabled={saving} className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 cursor-pointer disabled:opacity-50">
                {saving ? 'Saving...' : 'Approve & Save ✓'}
              </button>
            ) : (
              <button onClick={() => onSaveField('copy-bible', approvedKey, 'false')} className="flex-1 bg-white border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-50 cursor-pointer">Unapprove</button>
            )}
          </div>
        </div>
      )}

      {/* Editing */}
      {editingDoc && (
        <div className="space-y-2">
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className={`w-full border ${color.border} rounded-lg p-3 text-xs text-stone-700 font-sans leading-relaxed min-h-[200px] focus:outline-none focus:ring-2 focus:ring-orange-400`} />
          <div className="flex gap-2">
            <button onClick={() => { setEditingDoc(false); setEditText('') }} className="flex-1 bg-white border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer">Cancel</button>
            <button onClick={async () => { await onSaveField('copy-bible', textKey, editText); setEditingDoc(false); setEditText('') }} className={`flex-1 ${color.buttonBg} text-white px-3 py-1.5 rounded-lg text-xs font-semibold ${color.buttonHover} cursor-pointer`}>Save Changes</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Copy Bible Element Card — Dropdown with Page Copy + Email Sequence ──
const PAGE_COLOR = { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-700', buttonBg: 'bg-blue-600', buttonHover: 'hover:bg-blue-700' }
const EMAIL_COLOR = { bg: 'bg-purple-50/50', border: 'border-purple-200', text: 'text-purple-700', buttonBg: 'bg-purple-600', buttonHover: 'hover:bg-purple-700' }

function CopyBibleElementCard({
  index,
  elementLabel,
  elementFull,
  client,
  fieldValues,
  onSaveField,
  profileText,
  bibleText,
  voiceText,
  transcript,
}: {
  index: number
  elementLabel: string
  elementFull: string
  client: Client
  fieldValues: Map<string, string>
  onSaveField: (stageKey: string, fieldKey: string, value: string) => void
  profileText: string
  bibleText: string
  voiceText: string
  transcript: string
}) {
  const [open, setOpen] = useState(false)

  const pageApproved = fieldValues.get(`copy-bible:element_${index}_page_approved`) === 'true'
  const emailApproved = fieldValues.get(`copy-bible:element_${index}_email_approved`) === 'true'
  const pageText = fieldValues.get(`copy-bible:element_${index}_page_text`) || ''
  const emailText = fieldValues.get(`copy-bible:element_${index}_email_text`) || ''
  const bothApproved = pageApproved && emailApproved
  const hasDraft = !!(pageText || emailText)

  return (
    <div className={`rounded-lg border overflow-hidden ${bothApproved ? 'border-green-300 bg-green-50/30' : 'border-stone-200'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            bothApproved ? 'bg-green-500 text-white' : hasDraft ? 'bg-orange-500 text-white' : 'bg-stone-300 text-white'
          }`}>
            {bothApproved ? '✓' : (index + 1)}
          </span>
          <span className="text-sm font-semibold text-stone-800 text-left">{elementLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {pageApproved && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">PAGE ✓</span>}
          {emailApproved && <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">EMAIL ✓</span>}
          {hasDraft && !bothApproved && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">DRAFT</span>}
          <span className={`text-stone-400 transition-transform ml-1 ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-200 px-4 py-3 space-y-3">
          <CopySubSection type="page" label="Page Copy" icon="📄" color={PAGE_COLOR} index={index} elementFull={elementFull} client={client} fieldValues={fieldValues} onSaveField={onSaveField} profileText={profileText} bibleText={bibleText} voiceText={voiceText} transcript={transcript} />
          <CopySubSection type="email" label="Email Sequence" icon="✉️" color={EMAIL_COLOR} index={index} elementFull={elementFull} client={client} fieldValues={fieldValues} onSaveField={onSaveField} profileText={profileText} bibleText={bibleText} voiceText={voiceText} transcript={transcript} />
        </div>
      )}
    </div>
  )
}

function CopyBibleActions({
  client,
  fieldValues,
  onSaveField,
}: {
  client: Client
  fieldValues: Map<string, string>
  onSaveField: (stageKey: string, fieldKey: string, value: string) => void
}) {
  const transcript = fieldValues.get('strategy:session_transcript') || ''
  const profileText = fieldValues.get('strategy:client_profile_text') || ''
  const bibleText = fieldValues.get('strategy:research_bible_text') || ''
  const voiceText = fieldValues.get('strategy:brand_voice_text') || ''

  const funnelStrategyJson = fieldValues.get('funnel-strategy:funnel_elements_json') || ''
  const funnelSelectionsRaw = fieldValues.get('funnel-strategy:funnel_selections') || '[]'
  const implExtrasRaw = fieldValues.get('implementation-plan:extra_elements') || '[]'

  type ElementInfo = { label: string; full: string }
  const elements: ElementInfo[] = []

  try {
    const allElements: FunnelElement[] = funnelStrategyJson ? JSON.parse(funnelStrategyJson) : []
    const selectedIndices: number[] = JSON.parse(funnelSelectionsRaw)
    if (allElements.length > 0 && selectedIndices.length > 0) {
      for (const i of selectedIndices) {
        const el = allElements[i]
        if (el) elements.push({ label: `${el.type}: ${el.topic}`, full: `${el.type}: ${el.topic} — ${el.description}` })
      }
    }
  } catch {}

  try {
    const extras: { type: string; topic: string }[] = JSON.parse(implExtrasRaw)
    for (const ex of extras) elements.push({ label: `${ex.type}: ${ex.topic}`, full: `${ex.type}: ${ex.topic}` })
  } catch {}

  const totalParts = elements.length * 2
  const approvedPages = elements.filter((_, i) => fieldValues.get(`copy-bible:element_${i}_page_approved`) === 'true').length
  const approvedEmails = elements.filter((_, i) => fieldValues.get(`copy-bible:element_${i}_email_approved`) === 'true').length
  const totalApproved = approvedPages + approvedEmails

  return (
    <div className="space-y-3">
      {/* Progress header */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider">Copy Bible — {elements.length} Elements</h4>
          <span className="text-xs text-stone-500">{totalApproved}/{totalParts} approved</span>
        </div>
        <div className="w-full bg-orange-100 rounded-full h-1.5">
          <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${totalParts > 0 ? (totalApproved / totalParts) * 100 : 0}%` }} />
        </div>
        <div className="flex gap-3 mt-2">
          <span className="text-xs text-blue-600">📄 {approvedPages}/{elements.length} page copy</span>
          <span className="text-xs text-purple-600">✉️ {approvedEmails}/{elements.length} email sequences</span>
        </div>
      </div>

      {elements.length === 0 ? (
        <div className="text-center py-4 text-sm text-stone-500">
          No funnel elements found. Complete the Funnel Strategy and Implementation Plan first.
        </div>
      ) : (
        <div className="space-y-2">
          {elements.map((el, i) => (
            <CopyBibleElementCard
              key={i}
              index={i}
              elementLabel={el.label}
              elementFull={el.full}
              client={client}
              fieldValues={fieldValues}
              onSaveField={onSaveField}
              profileText={profileText}
              bibleText={bibleText}
              voiceText={voiceText}
              transcript={transcript}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Brand Bible Actions — Visual identity management ──
function BrandBibleActions({
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
  const [editingSection, setEditingSection] = useState<string | null>(null)

  const canvaUrl = fieldValues.get('brand-bible:canva_brand_kit_url') || ''
  const logoUrl = fieldValues.get('brand-bible:logo_url') || ''
  const logoNotes = fieldValues.get('brand-bible:logo_notes') || ''
  const primaryColor = fieldValues.get('brand-bible:primary_color') || '#000000'
  const secondaryColor = fieldValues.get('brand-bible:secondary_color') || '#ffffff'
  const accentColor = fieldValues.get('brand-bible:accent_color') || ''
  const extraColors = fieldValues.get('brand-bible:extra_colors') || ''
  const primaryFont = fieldValues.get('brand-bible:primary_font') || ''
  const secondaryFont = fieldValues.get('brand-bible:secondary_font') || ''
  const fontNotes = fieldValues.get('brand-bible:font_notes') || ''
  const imageryStyle = fieldValues.get('brand-bible:imagery_style') || ''
  const brandTone = fieldValues.get('brand-bible:brand_tone') || ''
  const designNotes = fieldValues.get('brand-bible:design_notes') || ''
  const isComplete = fieldValues.get('brand-bible:brand_bible_complete') === 'true'

  // Check if minimum required fields are filled
  const hasMinimum = !!(primaryColor && primaryFont && (canvaUrl || logoUrl || logoNotes))

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) { alert('Please allow popups to download the PDF.'); return }
    const colorBox = (c: string, label: string) => c ? `<div style="display:inline-flex;align-items:center;gap:8px;margin-right:16px;margin-bottom:8px"><div style="width:40px;height:40px;border-radius:8px;background:${c};border:1px solid #ddd"></div><div><div style="font-size:12px;font-weight:700">${label}</div><div style="font-size:11px;color:#666">${c}</div></div></div>` : ''
    printWindow.document.write(`
      <html><head><title>${client.name} — Brand Bible</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 28px; margin-bottom: 4px; }
        h2 { font-size: 18px; margin-top: 32px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; }
        .section { margin-bottom: 24px; }
        .field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
        .field-value { font-size: 14px; margin-bottom: 12px; }
        .colors { display: flex; flex-wrap: wrap; margin-bottom: 12px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>${client.name} — Brand Bible</h1>
      <div class="subtitle">${client.brand || ''} • Visual Identity Guide</div>
      ${canvaUrl ? `<div class="section"><div class="field-label">Canva Brand Kit</div><div class="field-value"><a href="${canvaUrl}">${canvaUrl}</a></div></div>` : ''}
      <h2>Logo</h2>
      <div class="section">
        ${logoUrl ? `<div style="margin-bottom:12px"><img src="${logoUrl}" alt="Logo" style="max-height:80px;max-width:200px;object-fit:contain" onerror="this.style.display='none'" /></div><div class="field-label">Logo URL</div><div class="field-value" style="word-break:break-all">${logoUrl}</div>` : ''}
        ${logoNotes ? `<div class="field-label">Logo Notes</div><div class="field-value">${logoNotes}</div>` : ''}
      </div>
      <h2>Colours</h2>
      <div class="colors">
        ${colorBox(primaryColor, 'Primary')}
        ${colorBox(secondaryColor, 'Secondary')}
        ${colorBox(accentColor, 'Accent')}
      </div>
      ${extraColors ? `<div class="field-label">Additional Colours</div><div class="field-value">${extraColors}</div>` : ''}
      <h2>Typography</h2>
      <div class="section">
        <div class="field-label">Primary Font (Headings)</div>
        <div class="field-value" style="font-size:20px;font-weight:700">${primaryFont || 'Not set'}</div>
        <div class="field-label">Secondary Font (Body)</div>
        <div class="field-value">${secondaryFont || 'Not set'}</div>
        ${fontNotes ? `<div class="field-label">Font Notes</div><div class="field-value">${fontNotes}</div>` : ''}
      </div>
      <h2>Imagery & Style</h2>
      <div class="section">
        ${imageryStyle ? `<div class="field-label">Imagery Style</div><div class="field-value">${imageryStyle.split('||').join(', ')}</div>` : ''}
        ${brandTone ? `<div class="field-label">Brand Tone / Mood</div><div class="field-value">${brandTone.split('||').join(', ')}</div>` : ''}
        ${designNotes ? `<div class="field-label">Design Direction</div><div class="field-value">${designNotes.split('||').join(', ')}</div>` : ''}
      </div>
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
      </body></html>
    `)
    printWindow.document.close()
  }

  const LogoUploadField = ({ logoUrl: currentLogo, onSaveUrl, clientId }: { logoUrl: string; onSaveUrl: (url: string) => void; clientId: string }) => {
    const [uploading, setUploading] = useState(false)
    const [pasteMode, setPasteMode] = useState(false)
    const [pasteUrl, setPasteUrl] = useState(currentLogo)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return }
      if (file.size > 5 * 1024 * 1024) { alert('File too large. Max 5MB.'); return }

      setUploading(true)
      try {
        const { supabase } = await import('@/lib/supabase')
        const ext = file.name.split('.').pop() || 'png'
        const path = `logos/${clientId}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
        if (error) {
          // Try creating bucket if it doesn't exist
          if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
            await supabase.storage.createBucket('brand-assets', { public: true })
            const { error: retryErr } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
            if (retryErr) throw retryErr
          } else {
            throw error
          }
        }
        const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path)
        if (urlData?.publicUrl) {
          onSaveUrl(urlData.publicUrl)
        }
      } catch (err) {
        alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}. You can paste a URL instead.`)
      }
      setUploading(false)
      e.target.value = ''
    }

    return (
      <div>
        <label className="text-xs font-semibold text-stone-600 block mb-1">Logo</label>
        {/* Preview */}
        {currentLogo && (
          <div className="mb-2 flex items-center gap-3 bg-stone-50 rounded-lg p-2 border border-stone-200">
            {currentLogo.startsWith('http') && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentLogo} alt="Logo" className="h-12 w-auto rounded object-contain" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-600 truncate">{currentLogo}</p>
            </div>
            <button onClick={() => onSaveUrl('')} className="text-xs text-red-500 hover:text-red-700 cursor-pointer flex-shrink-0">Remove</button>
          </div>
        )}

        <div className="flex gap-2">
          {/* Upload button */}
          <label className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-pink-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-pink-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-sm">📁</span>
            <span className="text-xs font-medium text-pink-700">{uploading ? 'Uploading...' : 'Upload Logo Image'}</span>
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
          {/* Or paste URL */}
          <button onClick={() => setPasteMode(!pasteMode)} className="px-3 py-2 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer">
            Paste URL
          </button>
        </div>

        {pasteMode && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder="https://drive.google.com/... or direct image URL"
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <button onClick={() => { onSaveUrl(pasteUrl); setPasteMode(false) }} className="bg-pink-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-pink-700 cursor-pointer">Save</button>
          </div>
        )}
      </div>
    )
  }

  const MultiSelectTags = ({ label, fieldKey, options }: { label: string; fieldKey: string; options: string[] }) => {
    const raw = fieldValues.get(`brand-bible:${fieldKey}`) || ''
    const selected: string[] = raw ? raw.split('||').filter(Boolean) : []
    const toggle = (tag: string) => {
      const next = selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]
      onSaveField('brand-bible', fieldKey, next.join('||'))
    }
    return (
      <div>
        <label className="text-xs font-semibold text-stone-600 block mb-1.5">{label}</label>
        <div className="flex flex-wrap gap-1.5">
          {options.map(opt => {
            const isSelected = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-pink-600 text-white border-pink-600 font-semibold'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-pink-300 hover:text-pink-700'
                }`}
              >
                {isSelected && '✓ '}{opt}
              </button>
            )
          })}
        </div>
        {selected.length > 0 && (
          <p className="text-[10px] text-stone-400 mt-1.5">{selected.length} selected</p>
        )}
      </div>
    )
  }

  const FONT_OPTIONS = [
    // Sans-Serif
    'Inter', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito', 'Raleway', 'Work Sans', 'DM Sans', 'Outfit',
    'Manrope', 'Plus Jakarta Sans', 'Source Sans 3', 'Rubik', 'Figtree', 'Albert Sans', 'Urbanist', 'Sora',
    // Serif
    'Playfair Display', 'Lora', 'Merriweather', 'EB Garamond', 'Libre Baskerville', 'Cormorant Garamond', 'DM Serif Display',
    'Fraunces', 'Noto Serif', 'Bitter', 'Crimson Text', 'Vollkorn', 'Source Serif 4',
    // Display / Decorative
    'Abril Fatface', 'Oswald', 'Bebas Neue', 'Anton', 'Righteous', 'Archivo Black', 'Lexend',
    // Script / Handwritten
    'Dancing Script', 'Pacifico', 'Great Vibes', 'Satisfy', 'Sacramento', 'Alex Brush', 'Caveat', 'Kalam',
  ]

  const FontSelectField = ({ label, fieldKey }: { label: string; fieldKey: string }) => {
    const value = fieldValues.get(`brand-bible:${fieldKey}`) || ''
    const [customMode, setCustomMode] = useState(false)
    const isCustom = value && !FONT_OPTIONS.includes(value)

    return (
      <div>
        <label className="text-xs font-semibold text-stone-600 block mb-1">{label}</label>
        {!customMode && !isCustom ? (
          <div className="flex gap-2">
            <select
              value={value}
              onChange={(e) => onSaveField('brand-bible', fieldKey, e.target.value)}
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white cursor-pointer"
            >
              <option value="">Select a font...</option>
              <optgroup label="Sans-Serif">
                {FONT_OPTIONS.slice(0, 18).map(f => <option key={f} value={f}>{f}</option>)}
              </optgroup>
              <optgroup label="Serif">
                {FONT_OPTIONS.slice(18, 31).map(f => <option key={f} value={f}>{f}</option>)}
              </optgroup>
              <optgroup label="Display">
                {FONT_OPTIONS.slice(31, 38).map(f => <option key={f} value={f}>{f}</option>)}
              </optgroup>
              <optgroup label="Script / Handwritten">
                {FONT_OPTIONS.slice(38).map(f => <option key={f} value={f}>{f}</option>)}
              </optgroup>
            </select>
            <button onClick={() => setCustomMode(true)} className="px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-500 hover:bg-stone-50 cursor-pointer whitespace-nowrap">
              Custom
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => onSaveField('brand-bible', fieldKey, e.target.value)}
              placeholder="Type custom font name..."
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <button onClick={() => setCustomMode(false)} className="px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-500 hover:bg-stone-50 cursor-pointer whitespace-nowrap">
              List
            </button>
          </div>
        )}
      </div>
    )
  }

  const InputField = ({ label, fieldKey, placeholder, type = 'text', multiline = false }: { label: string; fieldKey: string; placeholder: string; type?: string; multiline?: boolean }) => (
    <div>
      <label className="text-xs font-semibold text-stone-600 block mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={fieldValues.get(`brand-bible:${fieldKey}`) || ''}
          onChange={(e) => onSaveField('brand-bible', fieldKey, e.target.value)}
          placeholder={placeholder}
          className="w-full border border-stone-200 rounded-lg p-2.5 text-xs text-stone-700 leading-relaxed min-h-[60px] focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-stone-400 resize-y"
        />
      ) : type === 'color' ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={fieldValues.get(`brand-bible:${fieldKey}`) || '#000000'}
            onChange={(e) => onSaveField('brand-bible', fieldKey, e.target.value)}
            className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer"
          />
          <input
            type="text"
            value={fieldValues.get(`brand-bible:${fieldKey}`) || ''}
            onChange={(e) => onSaveField('brand-bible', fieldKey, e.target.value)}
            placeholder="#000000"
            className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>
      ) : (
        <input
          type="text"
          value={fieldValues.get(`brand-bible:${fieldKey}`) || ''}
          onChange={(e) => onSaveField('brand-bible', fieldKey, e.target.value)}
          placeholder={placeholder}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-stone-400"
        />
      )}
    </div>
  )

  const Section = ({ title, icon, children, id }: { title: string; icon: string; children: React.ReactNode; id: string }) => {
    const isOpen = editingSection === id
    return (
      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <button type="button" onClick={() => setEditingSection(isOpen ? null : id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors cursor-pointer">
          <span className="text-sm font-semibold text-stone-800 flex items-center gap-2"><span>{icon}</span>{title}</span>
          <span className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {isOpen && <div className="border-t border-stone-200 px-4 py-3 space-y-3">{children}</div>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Canva Brand Kit link */}
      <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 space-y-2">
        <h4 className="text-xs font-bold text-pink-700 uppercase tracking-wider">Canva Brand Kit</h4>
        <p className="text-xs text-stone-500">Paste the client&apos;s Canva Brand Kit URL, then copy the colours, fonts, and logo details into the sections below.</p>
        <input
          type="text"
          value={canvaUrl}
          onChange={(e) => onSaveField('brand-bible', 'canva_brand_kit_url', e.target.value)}
          placeholder="https://www.canva.com/brand/..."
          className="w-full border border-pink-200 rounded-lg px-3 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-stone-400"
        />
        {canvaUrl && (
          <div className="flex items-center justify-between">
            <a href={canvaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-pink-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-pink-700 transition-colors">
              Open in Canva to Copy Details →
            </a>
            <span className="text-[10px] text-stone-400">Open Canva side-by-side and fill in the fields below</span>
          </div>
        )}
      </div>

      {canvaUrl && !primaryFont && !logoUrl && !logoNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <span className="text-amber-500 mt-0.5">⚠️</span>
          <p className="text-xs text-amber-700">Brand Kit URL added but details are empty. Open the Canva Brand Kit above and copy the <strong>colours</strong>, <strong>fonts</strong>, and <strong>logo</strong> into the sections below.</p>
        </div>
      )}

      {/* Build Brand Bible sections */}
      <Section title="Logo" icon="🎨" id="logo">
        <LogoUploadField
          logoUrl={logoUrl}
          onSaveUrl={(url) => onSaveField('brand-bible', 'logo_url', url)}
          clientId={client.id}
        />
        <InputField label="Logo usage notes" fieldKey="logo_notes" placeholder="Minimum size, clear space rules, when to use which version..." multiline />
      </Section>

      <Section title="Colours" icon="🎨" id="colours">
        <div className="grid grid-cols-3 gap-3">
          <InputField label="Primary" fieldKey="primary_color" placeholder="#000000" type="color" />
          <InputField label="Secondary" fieldKey="secondary_color" placeholder="#ffffff" type="color" />
          <InputField label="Accent" fieldKey="accent_color" placeholder="#..." type="color" />
        </div>
        <InputField label="Additional colours (hex codes, comma separated)" fieldKey="extra_colors" placeholder="#F5A623, #4A90D9, ..." />
      </Section>

      <Section title="Typography" icon="🔤" id="typography">
        <FontSelectField label="Primary Font (Headings)" fieldKey="primary_font" />
        <FontSelectField label="Secondary Font (Body text)" fieldKey="secondary_font" />
        <InputField label="Font usage notes" fieldKey="font_notes" placeholder="Sizes, weights, when to use which font..." multiline />
      </Section>

      <Section title="Imagery & Style" icon="📸" id="imagery">
        <MultiSelectTags
          label="Imagery Style"
          fieldKey="imagery_style"
          options={[
            'Warm & Natural Lighting', 'Bright & Airy', 'Dark & Moody', 'High Contrast', 'Soft & Muted',
            'Authentic Photography', 'Lifestyle Shots', 'Studio Photography', 'Flat Lay', 'Candid & Unposed',
            'No Stock Photos', 'Minimalist', 'Bold & Colourful', 'Earthy Tones', 'Pastel Palette',
            'Editorial Style', 'Behind the Scenes', 'Product-Focused', 'People-Centred', 'Nature & Organic',
            'Urban & Modern', 'Luxury & Premium', 'Playful & Fun', 'Clean & Corporate', 'Textured & Raw',
          ]}
        />
        <MultiSelectTags
          label="Brand Tone / Mood"
          fieldKey="brand_tone"
          options={[
            'Empowering', 'Warm', 'Professional', 'Approachable', 'Feminine', 'Bold', 'Confident',
            'Nurturing', 'Inspirational', 'Authentic', 'Playful', 'Sophisticated', 'Energetic', 'Calm',
            'Luxurious', 'Friendly', 'Trustworthy', 'Edgy', 'Motivational', 'Inclusive',
            'Community-Driven', 'Educational', 'Conversational', 'Aspirational', 'Down to Earth',
          ]}
        />
        <MultiSelectTags
          label="Design Direction"
          fieldKey="design_notes"
          options={[
            'Clean Lines', 'Rounded Corners', 'Geometric Shapes', 'Organic Shapes', 'Minimalist Layout',
            'Bold Typography', 'Lots of White Space', 'Gradient Effects', 'Drop Shadows', 'Flat Design',
            'Icon-Heavy', 'Illustration Style', 'Photo Overlays', 'Duotone Effects', 'Hand-Drawn Elements',
            'Grid-Based', 'Asymmetric Layout', 'Card-Based UI', 'Full-Width Sections', 'Parallax Scrolling',
          ]}
        />
      </Section>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleDownloadPDF}
          disabled={!hasMinimum}
          className="flex-1 bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pink-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download Brand Bible PDF
        </button>
      </div>

      {/* Complete & Advance */}
      {!isComplete ? (
        <button
          type="button"
          onClick={async () => {
            if (!hasMinimum) {
              alert('Please fill in at least: a colour and a font, plus either a Canva link or logo info.')
              return
            }
            await onSaveField('brand-bible', 'brand_bible_complete', 'true')
            onAdvance()
          }}
          disabled={!hasMinimum}
          className="w-full bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {hasMinimum ? 'Complete Brand Bible & Move to Production →' : 'Fill in required fields to continue'}
        </button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-sm font-semibold text-green-700">✓ Brand Bible complete</p>
          <button onClick={async () => { await onSaveField('brand-bible', 'brand_bible_complete', 'false') }} className="text-xs text-amber-600 hover:text-amber-800 mt-1 cursor-pointer">Reopen for editing</button>
        </div>
      )}
    </div>
  )
}

// ── Funnel Strategy Actions — AI-suggested funnel elements with selectable cards ──
type FunnelElement = {
  type: string
  topic: string
  description: string
  email_note?: string
  funnel_stage: string
  reasoning: string
  priority: number
}

// ── ClickUp types ──
interface ClickUpTask {
  id: string
  name: string
  status: { status: string; color: string }
  assignees: { username: string; profilePicture: string | null; initials: string }[]
  due_date: string | null
  date_created: string
  date_updated: string
  url: string
  priority: { priority: string; color: string } | null
  tags: { name: string; tag_bg: string; tag_fg: string }[]
  parent: string | null
}
interface ClickUpList { id: string; name: string }
interface ClickUpFolder { id: string; name: string; lists: ClickUpList[] }
interface ClickUpSpace { id: string; name: string; folders: ClickUpFolder[]; lists: ClickUpList[] }

function ProductionActions({
  client,
  fieldValues,
  onSaveField,
}: {
  client: Client
  fieldValues: Map<string, string>
  onSaveField: (stageKey: string, fieldKey: string, value: string) => void
}) {
  const [tasks, setTasks] = useState<ClickUpTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [spaces, setSpaces] = useState<ClickUpSpace[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const linkedListId = fieldValues.get('production:clickup_list_id') || ''
  const linkedListName = fieldValues.get('production:clickup_list_name') || ''

  // Fetch tasks when list is linked
  const fetchTasks = useCallback(async (listId: string) => {
    if (!listId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/clickup-tasks?listId=${listId}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTasks(data.tasks || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (linkedListId) fetchTasks(linkedListId)
  }, [linkedListId, fetchTasks])

  // Fetch workspace hierarchy for picker
  const openPicker = async () => {
    setShowPicker(true)
    if (spaces.length > 0) return
    setLoadingSpaces(true)
    try {
      const res = await fetch('/api/clickup-tasks')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSpaces(data.spaces || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ClickUp workspace')
    } finally {
      setLoadingSpaces(false)
    }
  }

  const linkList = (listId: string, listName: string) => {
    onSaveField('production', 'clickup_list_id', listId)
    onSaveField('production', 'clickup_list_name', listName)
    setShowPicker(false)
    fetchTasks(listId)
  }

  // Task stats
  const parentTasks = tasks.filter(t => !t.parent)
  const closedStatuses = ['complete', 'closed', 'done', 'approved', 'delivered']
  const completedTasks = parentTasks.filter(t => closedStatuses.includes(t.status.status.toLowerCase()))
  const activeTasks = parentTasks.filter(t => !closedStatuses.includes(t.status.status.toLowerCase()))

  // Get unique statuses for filter
  const allStatuses = [...new Set(parentTasks.map(t => t.status.status))]

  const filteredTasks = filterStatus === 'all'
    ? parentTasks
    : parentTasks.filter(t => t.status.status === filterStatus)

  const progressPct = parentTasks.length > 0 ? Math.round((completedTasks.length / parentTasks.length) * 100) : 0

  return (
    <div className="space-y-4">
      {/* ClickUp Link Section */}
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <div>
              <h3 className="font-semibold text-stone-800">ClickUp Production Board</h3>
              {linkedListName && (
                <p className="text-xs text-stone-500">Linked to: <span className="font-medium text-rose-600">{linkedListName}</span></p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {linkedListId && (
              <button
                onClick={() => fetchTasks(linkedListId)}
                className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"
              >
                Refresh
              </button>
            )}
            <button
              onClick={openPicker}
              className="text-xs px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-medium transition-colors"
            >
              {linkedListId ? 'Change List' : 'Link ClickUp List'}
            </button>
          </div>
        </div>

        {/* List Picker Modal */}
        {showPicker && (
          <div className="border border-stone-200 rounded-lg bg-stone-50 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm text-stone-700">Select a ClickUp List</h4>
              <button onClick={() => setShowPicker(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {loadingSpaces ? (
              <div className="flex items-center gap-2 text-sm text-stone-500 py-4 justify-center">
                <div className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                Loading workspace...
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {spaces.map(space => (
                  <div key={space.id}>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">{space.name}</p>
                    {/* Folders */}
                    {space.folders.map(folder => (
                      <div key={folder.id} className="ml-2 mb-2">
                        <p className="text-xs font-medium text-stone-600 mb-1">{folder.name}</p>
                        <div className="ml-2 space-y-0.5">
                          {folder.lists.map(list => (
                            <button
                              key={list.id}
                              onClick={() => linkList(list.id, `${space.name} / ${folder.name} / ${list.name}`)}
                              className={`w-full text-left text-sm px-3 py-1.5 rounded hover:bg-rose-50 hover:text-rose-700 transition-colors ${linkedListId === list.id ? 'bg-rose-100 text-rose-700 font-medium' : 'text-stone-700'}`}
                            >
                              {list.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {/* Folderless lists */}
                    {space.lists.length > 0 && (
                      <div className="ml-2 space-y-0.5">
                        {space.lists.map(list => (
                          <button
                            key={list.id}
                            onClick={() => linkList(list.id, `${space.name} / ${list.name}`)}
                            className={`w-full text-left text-sm px-3 py-1.5 rounded hover:bg-rose-50 hover:text-rose-700 transition-colors ${linkedListId === list.id ? 'bg-rose-100 text-rose-700 font-medium' : 'text-stone-700'}`}
                          >
                            {list.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!linkedListId && !showPicker && (
          <div className="text-center py-8 border border-dashed border-stone-300 rounded-lg bg-stone-50">
            <svg className="w-10 h-10 text-stone-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            <p className="text-sm text-stone-500 mb-1">No ClickUp list linked yet</p>
            <p className="text-xs text-stone-400">Link a ClickUp list to track production tasks for this client</p>
          </div>
        )}
      </div>

      {/* Progress & Tasks */}
      {linkedListId && (
        <>
          {/* Progress Bar */}
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-stone-700 text-sm">Production Progress</h4>
              <span className="text-xs font-semibold text-stone-500">{completedTasks.length}/{parentTasks.length} tasks</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: progressPct === 100 ? '#22c55e' : 'linear-gradient(90deg, #E11D48, #F43F5E)',
                }}
              />
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                {activeTasks.length} active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {completedTasks.length} completed
              </span>
              {progressPct === 100 && parentTasks.length > 0 && (
                <span className="ml-auto text-green-600 font-semibold">All tasks complete!</span>
              )}
            </div>
          </div>

          {/* Filter & Task List */}
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-stone-700 text-sm">Tasks</h4>
              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-600"
                >
                  <option value="all">All ({parentTasks.length})</option>
                  {allStatuses.map(s => (
                    <option key={s} value={s}>{s} ({parentTasks.filter(t => t.status.status === s).length})</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-stone-500 py-8 justify-center">
                <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                Loading tasks...
              </div>
            ) : error ? (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
            ) : filteredTasks.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">No tasks found</p>
            ) : (
              <div className="space-y-1.5">
                {filteredTasks.map(task => {
                  const isComplete = closedStatuses.includes(task.status.status.toLowerCase())
                  const isExpanded = expandedTasks.has(task.id)
                  const subtasks = tasks.filter(t => t.parent === task.id)
                  const dueDate = task.due_date ? new Date(parseInt(task.due_date)) : null
                  const isOverdue = dueDate && !isComplete && dueDate < new Date()

                  return (
                    <div key={task.id} className="border border-stone-100 rounded-lg overflow-hidden">
                      <div
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-stone-50 transition-colors ${isComplete ? 'opacity-60' : ''}`}
                        onClick={() => {
                          const next = new Set(expandedTasks)
                          isExpanded ? next.delete(task.id) : next.add(task.id)
                          setExpandedTasks(next)
                        }}
                      >
                        {/* Status dot */}
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0 border"
                          style={{
                            backgroundColor: task.status.color || '#94a3b8',
                            borderColor: task.status.color || '#94a3b8',
                          }}
                        />

                        {/* Task name */}
                        <span className={`text-sm flex-1 ${isComplete ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                          {task.name}
                        </span>

                        {/* Priority badge */}
                        {task.priority && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: task.priority.color + '20', color: task.priority.color }}
                          >
                            {task.priority.priority}
                          </span>
                        )}

                        {/* Assignees */}
                        {task.assignees.length > 0 && (
                          <div className="flex -space-x-1">
                            {task.assignees.slice(0, 3).map((a, i) => (
                              <div
                                key={i}
                                className="w-6 h-6 rounded-full bg-rose-100 border-2 border-white flex items-center justify-center"
                                title={a.username}
                              >
                                {a.profilePicture ? (
                                  <img src={a.profilePicture} alt={a.username} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <span className="text-[9px] font-bold text-rose-600">{a.initials || a.username?.slice(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Due date */}
                        {dueDate && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isOverdue ? 'bg-red-100 text-red-600 font-semibold' : 'bg-stone-100 text-stone-500'}`}>
                            {dueDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          </span>
                        )}

                        {/* Status label */}
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: (task.status.color || '#94a3b8') + '20', color: task.status.color || '#64748b' }}
                        >
                          {task.status.status}
                        </span>

                        {/* Expand arrow */}
                        <svg className={`w-3 h-3 text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-stone-100 bg-stone-50/50">
                          <div className="flex items-center gap-3 text-xs text-stone-500 mb-2">
                            <span>Created: {new Date(parseInt(task.date_created)).toLocaleDateString('en-ZA')}</span>
                            <span>Updated: {new Date(parseInt(task.date_updated)).toLocaleDateString('en-ZA')}</span>
                          </div>

                          {/* Tags */}
                          {task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {task.tags.map(tag => (
                                <span
                                  key={tag.name}
                                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                  style={{ backgroundColor: tag.tag_bg, color: tag.tag_fg }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Subtasks */}
                          {subtasks.length > 0 && (
                            <div className="mt-2">
                              <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">Subtasks ({subtasks.length})</p>
                              <div className="space-y-0.5 ml-2">
                                {subtasks.map(sub => (
                                  <div key={sub.id} className="flex items-center gap-2 text-xs">
                                    <span
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: sub.status.color || '#94a3b8' }}
                                    />
                                    <span className={closedStatuses.includes(sub.status.status.toLowerCase()) ? 'line-through text-stone-400' : 'text-stone-600'}>
                                      {sub.name}
                                    </span>
                                    <span className="text-stone-400 ml-auto">{sub.status.status}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Open in ClickUp */}
                          <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-rose-600 hover:text-rose-700 font-medium"
                          >
                            Open in ClickUp
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Internal Check: 2-person QA sign-off ──
const CHECK_ITEMS = [
  { key: 'pages_match_copy', label: 'All pages match the approved Copy Bible' },
  { key: 'brand_consistent', label: 'Brand Bible applied consistently (colours, fonts, logo)' },
  { key: 'funnel_flow_works', label: 'Funnel flow works end-to-end (every link, button, redirect)' },
  { key: 'forms_working', label: 'All forms submit correctly and trigger automations' },
  { key: 'email_sequences', label: 'Email sequences trigger correctly and content matches copy' },
  { key: 'mobile_responsive', label: 'All pages are mobile responsive' },
  { key: 'tracking_pixels', label: 'Tracking pixels / analytics installed and firing' },
  { key: 'payment_links', label: 'Payment links / checkout working (if applicable)' },
  { key: 'thank_you_pages', label: 'Thank-you / confirmation pages set up correctly' },
  { key: 'domain_ssl', label: 'Custom domain connected and SSL active' },
  { key: 'speed_check', label: 'Page load speed acceptable' },
  { key: 'spelling_grammar', label: 'No spelling or grammar errors' },
]

function InternalCheckActions({
  client,
  fieldValues,
  onSaveField,
}: {
  client: Client
  fieldValues: Map<string, string>
  onSaveField: (stageKey: string, fieldKey: string, value: string) => void
}) {
  const reviewer1Name = fieldValues.get('internal-check:reviewer1_name') || ''
  const reviewer2Name = fieldValues.get('internal-check:reviewer2_name') || ''
  const reviewer1Signed = fieldValues.get('internal-check:reviewer1_signed') === 'true'
  const reviewer2Signed = fieldValues.get('internal-check:reviewer2_signed') === 'true'
  const checkNotes = fieldValues.get('internal-check:check_notes') || ''

  const getCheckValue = (reviewer: 1 | 2, key: string) =>
    fieldValues.get(`internal-check:r${reviewer}_${key}`) || ''

  const totalChecks = CHECK_ITEMS.length
  const r1Done = CHECK_ITEMS.filter(c => getCheckValue(1, c.key) === 'pass').length
  const r2Done = CHECK_ITEMS.filter(c => getCheckValue(2, c.key) === 'pass').length
  const r1Fails = CHECK_ITEMS.filter(c => getCheckValue(1, c.key) === 'fail').length
  const r2Fails = CHECK_ITEMS.filter(c => getCheckValue(2, c.key) === 'fail').length

  const bothComplete = r1Done === totalChecks && r2Done === totalChecks && r1Fails === 0 && r2Fails === 0

  const ReviewerColumn = ({ num, name, signed }: { num: 1 | 2; name: string; signed: boolean }) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${signed ? 'bg-green-100 text-green-700' : 'bg-violet-100 text-violet-700'}`}>
          {num}
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={name}
            onChange={e => onSaveField('internal-check', `reviewer${num}_name`, e.target.value)}
            placeholder={`Reviewer ${num} name`}
            className="w-full text-sm font-medium border-b border-stone-200 focus:border-violet-500 outline-none pb-1 bg-transparent"
          />
        </div>
      </div>

      <div className="space-y-1">
        {CHECK_ITEMS.map(item => {
          const val = getCheckValue(num, item.key)
          return (
            <div key={item.key} className="flex items-center gap-2 group">
              <button
                onClick={() => onSaveField('internal-check', `r${num}_${item.key}`, val === 'pass' ? '' : 'pass')}
                className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                  val === 'pass' ? 'bg-green-500 border-green-500 text-white' :
                  val === 'fail' ? 'bg-red-500 border-red-500 text-white' :
                  'border-stone-300 hover:border-violet-400'
                }`}
              >
                {val === 'pass' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                {val === 'fail' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
              </button>
              <span className={`text-xs flex-1 ${val === 'pass' ? 'text-stone-400 line-through' : val === 'fail' ? 'text-red-600' : 'text-stone-600'}`}>
                {item.label}
              </span>
              {val !== 'fail' && (
                <button
                  onClick={() => onSaveField('internal-check', `r${num}_${item.key}`, 'fail')}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-600 transition-opacity"
                  title="Flag as failed"
                >
                  Flag
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress */}
      <div className="mt-3 pt-3 border-t border-stone-100">
        <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
          <span>{r1Done + r2Done > 0 ? (num === 1 ? r1Done : r2Done) : 0}/{totalChecks} passed</span>
          {(num === 1 ? r1Fails : r2Fails) > 0 && (
            <span className="text-red-500 font-medium">{num === 1 ? r1Fails : r2Fails} flagged</span>
          )}
        </div>
        <div className="w-full bg-stone-100 rounded-full h-1.5">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((num === 1 ? r1Done : r2Done) / totalChecks) * 100}%`,
              backgroundColor: (num === 1 ? r1Fails : r2Fails) > 0 ? '#ef4444' : '#7c3aed',
            }}
          />
        </div>
      </div>

      {/* Sign-off */}
      <button
        onClick={() => onSaveField('internal-check', `reviewer${num}_signed`, signed ? 'false' : 'true')}
        disabled={!name || (num === 1 ? r1Done : r2Done) < totalChecks || (num === 1 ? r1Fails : r2Fails) > 0}
        className={`mt-3 w-full text-xs py-2 rounded-lg font-medium transition-all ${
          signed
            ? 'bg-green-100 text-green-700 border border-green-200'
            : name && (num === 1 ? r1Done : r2Done) === totalChecks && (num === 1 ? r1Fails : r2Fails) === 0
              ? 'bg-violet-600 text-white hover:bg-violet-700'
              : 'bg-stone-100 text-stone-400 cursor-not-allowed'
        }`}
      >
        {signed ? `Signed off by ${name}` : 'Sign Off'}
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="font-semibold text-stone-800">Internal Quality Check</h3>
            <p className="text-xs text-stone-500">Two team members must independently verify the entire build</p>
          </div>
          {bothComplete && reviewer1Signed && reviewer2Signed && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">All Clear</span>
          )}
        </div>

        {/* Two reviewer columns */}
        <div className="flex gap-6">
          <ReviewerColumn num={1} name={reviewer1Name} signed={reviewer1Signed} />
          <div className="w-px bg-stone-200" />
          <ReviewerColumn num={2} name={reviewer2Name} signed={reviewer2Signed} />
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <h4 className="text-sm font-medium text-stone-700 mb-2">Notes & Issues</h4>
        <textarea
          value={checkNotes}
          onChange={e => onSaveField('internal-check', 'check_notes', e.target.value)}
          placeholder="Flag any issues, concerns, or things to fix before hand-over..."
          rows={3}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 bg-white resize-none"
        />
      </div>
    </div>
  )
}

// ── Hand Over: Canva document + links summary ──
const LINK_FIELDS = [
  { key: 'lead_magnet_url', label: 'Lead Magnet Page', icon: '🧲' },
  { key: 'oto_url', label: 'One Time Offer Page', icon: '💰' },
  { key: 'main_product_url', label: 'Main Product / Course Page', icon: '🎓' },
  { key: 'sales_page_url', label: 'Sales Page', icon: '📄' },
  { key: 'checkout_url', label: 'Checkout / Payment Link', icon: '💳' },
  { key: 'email_platform_url', label: 'Email Platform Login', icon: '📧' },
  { key: 'hosting_url', label: 'Hosting / Systeme.io Login', icon: '🌐' },
  { key: 'analytics_url', label: 'Analytics Dashboard', icon: '📊' },
  { key: 'social_accounts', label: 'Social Accounts', icon: '📱' },
  { key: 'drive_folder_url', label: 'Google Drive Folder', icon: '📁' },
  { key: 'canva_brand_url', label: 'Canva Brand Kit', icon: '🎨' },
  { key: 'other_url_1', label: 'Other Link 1', icon: '🔗' },
  { key: 'other_url_2', label: 'Other Link 2', icon: '🔗' },
]

function HandOverActions({
  client,
  fieldValues,
  onSaveField,
}: {
  client: Client
  fieldValues: Map<string, string>
  onSaveField: (stageKey: string, fieldKey: string, value: string) => void
}) {
  const [generatingDoc, setGeneratingDoc] = useState(false)
  const canvaDocUrl = fieldValues.get('handover:canva_doc_url') || ''
  const walkthrough = fieldValues.get('handover:walkthrough_scheduled') || ''
  const handoverNotes = fieldValues.get('handover:notes') || ''
  const sentToClient = fieldValues.get('handover:sent_to_client') === 'true'

  const filledLinks = LINK_FIELDS.filter(f => fieldValues.get(`handover:${f.key}`)?.trim())

  // Generate handover summary for Canva
  const generateHandoverContent = () => {
    const brandName = fieldValues.get('onboarding:brand_name') || fieldValues.get('discovery:brand_name') || client.name || 'Client'
    const pkg = fieldValues.get('onboarding:package') || client.package || ''

    let content = `HAND-OVER DOCUMENT\n\n`
    content += `Client: ${brandName}\n`
    content += `Package: ${pkg}\n`
    content += `Date: ${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`
    content += `---\n\n`
    content += `WHAT WE BUILT\n\n`

    // Pull from stage data
    const funnelStrategy = fieldValues.get('funnel-strategy:generated_text') || ''
    if (funnelStrategy) {
      content += `Funnel Strategy: Completed\n`
    }

    const copyBibleComplete = fieldValues.get('copy-bible:copy_bible_complete') === 'true'
    if (copyBibleComplete) content += `Copy Bible: Completed\n`

    const brandBibleComplete = fieldValues.get('brand-bible:brand_bible_complete') === 'true'
    if (brandBibleComplete) content += `Brand Bible: Completed\n`

    content += `\n---\n\n`
    content += `ACCESS LINKS\n\n`

    LINK_FIELDS.forEach(f => {
      const val = fieldValues.get(`handover:${f.key}`)
      if (val?.trim()) {
        content += `${f.icon} ${f.label}: ${val}\n`
      }
    })

    content += `\n---\n\n`
    if (handoverNotes) {
      content += `NOTES\n${handoverNotes}\n\n`
    }
    content += `Prepared by ClubSheIs\n`
    return content
  }

  const downloadSummaryPdf = () => {
    const content = generateHandoverContent()
    const brandName = fieldValues.get('onboarding:brand_name') || client.name || 'Client'
    const logoUrl = fieldValues.get('brand-bible:logo_url') || ''
    const primaryColor = fieldValues.get('brand-bible:primary_color') || '#7C3AED'
    const secondaryColor = fieldValues.get('brand-bible:secondary_color') || '#1e1e1e'

    const linkRows = LINK_FIELDS
      .filter(f => fieldValues.get(`handover:${f.key}`)?.trim())
      .map(f => {
        const val = fieldValues.get(`handover:${f.key}`) || ''
        return `<tr><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${f.icon} ${f.label}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;"><a href="${val}" style="color:${primaryColor};word-break:break-all;">${val}</a></td></tr>`
      }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hand-Over — ${brandName}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Inter',sans-serif; color:${secondaryColor}; padding:40px; max-width:800px; margin:0 auto; }
      .header { text-align:center; margin-bottom:40px; padding-bottom:30px; border-bottom:3px solid ${primaryColor}; }
      .logo { max-height:60px; margin-bottom:16px; }
      h1 { font-size:28px; color:${primaryColor}; margin-bottom:8px; }
      .meta { font-size:13px; color:#666; }
      h2 { font-size:18px; color:${primaryColor}; margin:30px 0 16px; padding-bottom:8px; border-bottom:2px solid ${primaryColor}20; }
      table { width:100%; border-collapse:collapse; }
      .section { margin-bottom:24px; }
      .notes { background:#f8f8f8; border-radius:8px; padding:16px; font-size:13px; line-height:1.6; white-space:pre-wrap; }
      .footer { margin-top:40px; padding-top:20px; border-top:2px solid #eee; text-align:center; font-size:11px; color:#999; }
    </style>
    </head><body>
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo">` : ''}
      <h1>Hand-Over Document</h1>
      <div class="meta">${brandName} &bull; ${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>

    <h2>What We Built</h2>
    <div class="section">
      <table>
        ${fieldValues.get('funnel-strategy:generated_text') ? '<tr><td style="padding:8px 0;font-size:14px;">Funnel Strategy</td><td style="padding:8px 0;font-size:14px;color:green;">Complete</td></tr>' : ''}
        ${fieldValues.get('copy-bible:copy_bible_complete') === 'true' ? '<tr><td style="padding:8px 0;font-size:14px;">Copy Bible</td><td style="padding:8px 0;font-size:14px;color:green;">Complete</td></tr>' : ''}
        ${fieldValues.get('brand-bible:brand_bible_complete') === 'true' ? '<tr><td style="padding:8px 0;font-size:14px;">Brand Bible</td><td style="padding:8px 0;font-size:14px;color:green;">Complete</td></tr>' : ''}
      </table>
    </div>

    <h2>Access Links</h2>
    <div class="section">
      <table>${linkRows || '<tr><td style="padding:10px;font-size:13px;color:#999;">No links added yet</td></tr>'}</table>
    </div>

    ${handoverNotes ? `<h2>Notes</h2><div class="notes">${handoverNotes}</div>` : ''}

    <div class="footer">Prepared by ClubSheIs &bull; ${new Date().getFullYear()}</div>

    <script>window.onload=function(){setTimeout(function(){window.print();},500);}</script>
    </body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <div className="space-y-4">
      {/* Links Section */}
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </div>
          <div>
            <h3 className="font-semibold text-stone-800">Client Access Links</h3>
            <p className="text-xs text-stone-500">All the links the client needs to access their build</p>
          </div>
          <span className="ml-auto text-xs text-stone-400">{filledLinks.length}/{LINK_FIELDS.length} added</span>
        </div>

        <div className="space-y-2">
          {LINK_FIELDS.map(field => (
            <div key={field.key} className="flex items-center gap-2">
              <span className="text-base w-6 text-center flex-shrink-0">{field.icon}</span>
              <label className="text-xs text-stone-500 w-36 flex-shrink-0">{field.label}</label>
              <input
                type="url"
                value={fieldValues.get(`handover:${field.key}`) || ''}
                onChange={e => onSaveField('handover', field.key, e.target.value)}
                placeholder="https://..."
                className="flex-1 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 bg-white"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Canva Document */}
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div>
            <h3 className="font-semibold text-stone-800">Hand-Over Document</h3>
            <p className="text-xs text-stone-500">Create in Canva using the client&apos;s brand, or download a PDF summary</p>
          </div>
        </div>

        {/* Canva URL */}
        <div className="mb-3">
          <label className="text-xs font-medium text-stone-600 mb-1 block">Canva Document URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={canvaDocUrl}
              onChange={e => onSaveField('handover', 'canva_doc_url', e.target.value)}
              placeholder="Paste your Canva hand-over document link..."
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 bg-white"
            />
            {canvaDocUrl && (
              <a
                href={canvaDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors flex items-center gap-1"
              >
                Open in Canva
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}
          </div>
        </div>

        {/* Download PDF */}
        <button
          onClick={downloadSummaryPdf}
          className="w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Download Hand-Over PDF
        </button>
      </div>

      {/* Notes & Walkthrough */}
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <h4 className="text-sm font-medium text-stone-700 mb-2">Hand-Over Notes</h4>
        <textarea
          value={handoverNotes}
          onChange={e => onSaveField('handover', 'notes', e.target.value)}
          placeholder="Instructions, passwords (non-sensitive), next steps, things the client needs to know..."
          rows={3}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 bg-white resize-none mb-3"
        />

        <div className="flex items-center gap-3">
          <label className="text-xs text-stone-600">Walkthrough call:</label>
          <select
            value={walkthrough}
            onChange={e => onSaveField('handover', 'walkthrough_scheduled', e.target.value)}
            className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white text-stone-600"
          >
            <option value="">Not scheduled</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="not-needed">Not needed</option>
          </select>
        </div>

        {/* Sent to client */}
        <div className="mt-4 pt-4 border-t border-stone-100">
          <button
            onClick={() => onSaveField('handover', 'sent_to_client', sentToClient ? 'false' : 'true')}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              sentToClient
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {sentToClient ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Hand-Over Sent to Client
              </>
            ) : (
              'Mark as Sent to Client'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const STAGE_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  awareness: { label: 'Awareness', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  engagement: { label: 'Engagement', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  conversion: { label: 'Conversion', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  delivery: { label: 'Delivery', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  retention: { label: 'Retention', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
}

function FunnelStrategyActions({
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
  const [generating, setGenerating] = useState(false)
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
  const [addingCustom, setAddingCustom] = useState<Record<string, boolean>>({})

  // Load saved elements and selections
  const savedElementsRaw = fieldValues.get('funnel-strategy:funnel_elements_json') || ''
  const savedSelectionsRaw = fieldValues.get('funnel-strategy:funnel_selections') || '[]'

  let elements: FunnelElement[] = []
  try { if (savedElementsRaw) elements = JSON.parse(savedElementsRaw) } catch {}

  let selections: number[] = []
  try { selections = JSON.parse(savedSelectionsRaw) } catch {}

  // Get all context from previous stages
  const transcript = fieldValues.get('strategy:session_transcript') || ''
  const profileText = fieldValues.get('strategy:client_profile_text') || ''
  const bibleText = fieldValues.get('strategy:research_bible_text') || ''
  const voiceText = fieldValues.get('strategy:brand_voice_text') || ''

  const handleGenerate = async () => {
    if (!transcript && !profileText) {
      alert('No strategy session transcript or client profile found. Complete the Strategy Session stage first.')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'funnel-strategy',
          clientName: client.name,
          brandName: client.brand,
          transcript,
          clientProfile: profileText,
          researchBible: bibleText,
          brandVoice: voiceText,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        let errMsg = errText
        try { errMsg = JSON.parse(errText).error } catch {}
        alert(`Error: ${errMsg}`)
        setGenerating(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) { alert('No response stream'); setGenerating(false); return }
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullText += parsed.delta.text
              }
            } catch {}
          }
        }
      }
      if (buffer.trim().startsWith('data: ')) {
        try {
          const parsed = JSON.parse(buffer.trim().slice(6))
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) fullText += parsed.delta.text
        } catch {}
      }

      if (fullText) {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = fullText.trim()
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }
        try {
          const parsed = JSON.parse(jsonStr)
          if (Array.isArray(parsed)) {
            await onSaveField('funnel-strategy', 'funnel_elements_json', JSON.stringify(parsed))
            // Select all by default
            const allIndices = parsed.map((_: FunnelElement, i: number) => i)
            await onSaveField('funnel-strategy', 'funnel_selections', JSON.stringify(allIndices))
          } else {
            alert('AI response was not a valid list. Please try again.')
          }
        } catch {
          console.error('Failed to parse funnel elements JSON:', jsonStr.slice(0, 200))
          alert('Could not parse AI suggestions. Please try regenerating.')
        }
      } else {
        alert('Error: No content was generated. Please try again.')
      }
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : 'Network error'}. Please try again.`)
    }
    setGenerating(false)
  }

  const toggleSelection = async (idx: number) => {
    const next = selections.includes(idx)
      ? selections.filter(s => s !== idx)
      : [...selections, idx]
    await onSaveField('funnel-strategy', 'funnel_selections', JSON.stringify(next))
  }

  const selectAll = async () => {
    const allIndices = elements.map((_, i) => i)
    await onSaveField('funnel-strategy', 'funnel_selections', JSON.stringify(allIndices))
  }

  const deselectAll = async () => {
    await onSaveField('funnel-strategy', 'funnel_selections', JSON.stringify([]))
  }

  const handleAddCustom = async (stage: string) => {
    const text = (customInputs[stage] || '').trim()
    if (!text) return

    // Parse "Type: Topic" or just treat whole thing as topic
    let type = 'Custom'
    let topic = text
    const colonIdx = text.indexOf(':')
    if (colonIdx > 0 && colonIdx < 30) {
      type = text.slice(0, colonIdx).trim()
      topic = text.slice(colonIdx + 1).trim()
    }

    const newElement: FunnelElement = {
      type,
      topic,
      description: 'Custom element added by team',
      funnel_stage: stage,
      reasoning: 'Manually added based on team strategy',
      priority: elements.length + 1,
    }

    const updatedElements = [...elements, newElement]
    const newIdx = updatedElements.length - 1
    const updatedSelections = [...selections, newIdx]

    await onSaveField('funnel-strategy', 'funnel_elements_json', JSON.stringify(updatedElements))
    await onSaveField('funnel-strategy', 'funnel_selections', JSON.stringify(updatedSelections))
    setCustomInputs(prev => ({ ...prev, [stage]: '' }))
    setAddingCustom(prev => ({ ...prev, [stage]: false }))
  }

  const handleRemoveElement = async (idx: number) => {
    const updatedElements = elements.filter((_, i) => i !== idx)
    // Reindex selections — remove the deleted index and shift down any above it
    const updatedSelections = selections
      .filter(s => s !== idx)
      .map(s => s > idx ? s - 1 : s)

    await onSaveField('funnel-strategy', 'funnel_elements_json', JSON.stringify(updatedElements))
    await onSaveField('funnel-strategy', 'funnel_selections', JSON.stringify(updatedSelections))
  }

  // Group elements by funnel stage
  const stageOrder = ['awareness', 'engagement', 'conversion', 'delivery', 'retention']
  const grouped = stageOrder.map(stage => ({
    stage,
    items: elements
      .map((el, idx) => ({ ...el, originalIdx: idx }))
      .filter(el => el.funnel_stage === stage)
      .sort((a, b) => a.priority - b.priority),
  })).filter(g => g.items.length > 0)

  const selectedElements = selections.map(i => elements[i]).filter(Boolean)

  // Build summary for downstream stages (Implementation Plan / Copy Bible)
  const selectedSummary = selectedElements.map(el => `${el.type}: ${el.topic}`).join('\n- ')

  return (
    <div className="space-y-3">
      {/* Context check */}
      {!profileText && !transcript && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">Complete the Strategy Session stage first — the Funnel Strategy needs the Client Profile, Research Bible, and Brand Voice to generate tailored recommendations.</p>
        </div>
      )}

      {/* Generate / Regenerate button */}
      {!generating && (
        <button
          onClick={handleGenerate}
          disabled={!transcript && !profileText}
          className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            elements.length > 0
              ? 'bg-white border border-cyan-300 text-cyan-700 hover:bg-cyan-50'
              : 'bg-cyan-600 text-white hover:bg-cyan-700'
          }`}
        >
          {elements.length > 0 ? 'Regenerate Suggestions' : !transcript && !profileText ? 'Complete Strategy Session first' : 'Generate Funnel Strategy'}
        </button>
      )}
      {generating && (
        <div className="text-center py-4">
          <p className="text-sm text-cyan-600 animate-pulse">Analysing client data and generating tailored funnel elements...</p>
        </div>
      )}

      {/* Element cards grouped by funnel stage */}
      {elements.length > 0 && !generating && (
        <div className="space-y-4">
          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              <span className="font-semibold text-stone-700">{selections.length}</span> of {elements.length} elements selected
            </p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-cyan-600 hover:text-cyan-800 font-medium cursor-pointer">Select all</button>
              <span className="text-xs text-stone-300">|</span>
              <button onClick={deselectAll} className="text-xs text-stone-500 hover:text-stone-700 font-medium cursor-pointer">Deselect all</button>
            </div>
          </div>

          {grouped.map(({ stage, items }) => {
            const stageInfo = STAGE_LABELS[stage] || { label: stage, color: 'text-stone-700', bg: 'bg-stone-50', border: 'border-stone-200' }
            return (
              <div key={stage}>
                <div className={`text-xs font-bold uppercase tracking-wider ${stageInfo.color} mb-2 flex items-center gap-2`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${stageInfo.bg} ${stageInfo.border} border`} />
                  {stageInfo.label}
                </div>
                <div className="space-y-2">
                  {items.map((el) => {
                    const isSelected = selections.includes(el.originalIdx)
                    return (
                      <div key={el.originalIdx} className="relative group">
                        <button
                          type="button"
                          onClick={() => toggleSelection(el.originalIdx)}
                          className={`w-full text-left rounded-lg border p-3 transition-all cursor-pointer ${
                            isSelected
                              ? `${stageInfo.bg} ${stageInfo.border} ring-1 ring-offset-1 ring-cyan-300`
                              : 'bg-white border-stone-200 opacity-60 hover:opacity-80'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-cyan-600 border-cyan-600' : 'border-stone-300 bg-white'
                            }`}>
                              {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{el.type}</span>
                                <span className="text-xs text-stone-300">#{el.priority}</span>
                              </div>
                              <p className="text-sm font-semibold text-stone-800 mt-0.5">{el.topic}</p>
                              <p className="text-xs text-stone-500 mt-1 leading-relaxed">{el.description}</p>
                              {el.email_note && (
                                <p className="text-xs text-purple-500 mt-1 flex items-center gap-1">
                                  <span className="font-semibold">Email:</span> {el.email_note}
                                </p>
                              )}
                              <p className="text-xs text-stone-400 mt-1 italic">{el.reasoning}</p>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveElement(el.originalIdx) }}
                          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center hover:bg-red-200"
                          title="Remove element"
                        >
                          x
                        </button>
                      </div>
                    )
                  })}

                  {/* Add custom element */}
                  {addingCustom[stage] ? (
                    <div className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={customInputs[stage] || ''}
                        onChange={(e) => setCustomInputs(prev => ({ ...prev, [stage]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom(stage) }}
                        placeholder="e.g. Webinar: How to Scale Your Coaching Business"
                        className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 bg-white"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustom(stage)}
                        className="bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-cyan-700 cursor-pointer whitespace-nowrap"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingCustom(prev => ({ ...prev, [stage]: false })); setCustomInputs(prev => ({ ...prev, [stage]: '' })) }}
                        className="bg-white border border-stone-300 text-stone-500 px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingCustom(prev => ({ ...prev, [stage]: true }))}
                      className="w-full border border-dashed border-stone-300 rounded-lg py-2 text-xs text-stone-400 hover:text-stone-600 hover:border-stone-400 transition-colors cursor-pointer"
                    >
                      + Add your own {stageInfo.label.toLowerCase()} element
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Selected summary + confirm */}
          {selections.length > 0 && (
            <div className="space-y-3">
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                <h4 className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-1">Selected for this funnel ({selections.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedElements.map((el, i) => (
                    <span key={i} className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded font-medium">
                      {el.type}: {el.topic}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={onAdvance}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer"
              >
                Confirm Funnel Strategy & Move to Implementation Plan →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Shared email editor for proposals and thank-you emails ──
function EmailContentEditor({ content, onChange, readOnly }: { content: string; onChange: (v: string) => void; readOnly: boolean }) {
  if (!readOnly) {
    return (
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        className="w-full p-4 text-sm text-stone-700 leading-relaxed min-h-[400px] focus:outline-none resize-none font-mono"
      />
    )
  }
  return (
    <div className="p-4 text-sm text-stone-700 leading-relaxed max-h-[500px] overflow-y-auto">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('# ')) return <h2 key={i} className="text-lg font-bold text-stone-900 mt-4 mb-2">{line.replace('# ', '')}</h2>
        if (line.startsWith('## ')) return <h3 key={i} className="text-base font-bold text-stone-900 mt-3 mb-1">{line.replace('## ', '')}</h3>
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-stone-900 mt-2">{line.replace(/\*\*/g, '')}</p>
        if (line.startsWith('- ')) return <p key={i} className="pl-4 text-stone-600">&bull; {line.replace('- ', '')}</p>
        if (line.trim() === '') return <br key={i} />
        return <p key={i} className="text-stone-700">{line.replace(/\*\*/g, '').replace(/\*/g, '')}</p>
      })}
    </div>
  )
}

// ── Proposal / Thank-You review component for Stage 2 ──
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
  const emailType = fieldValues.get('proposal:email_type') || 'proposal'
  const isThankYou = emailType === 'not-a-fit'

  const savedProposal = fieldValues.get('proposal:generated_text') || ''
  const savedThankYou = fieldValues.get('proposal:thankyou_text') || ''
  const savedContent = isThankYou ? savedThankYou : savedProposal

  // Only use local state when editing — otherwise always read from fieldValues
  const [editDraft, setEditDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')
  const proposalStatus = fieldValues.get('proposal:proposal_status') || 'Draft'

  // The content to display — use edit draft when editing, otherwise always the saved value
  const emailContent = editing ? editDraft : savedContent

  const handleSave = async () => {
    const key = isThankYou ? 'thankyou_text' : 'generated_text'
    await onSaveField('proposal', key, editDraft)
    setEditing(false)
  }

  const handleStatusChange = async (status: string) => {
    await onSaveField('proposal', 'proposal_status', status)
  }

  const handleSendEmail = async () => {
    if (!client.email) { alert('No email address for this client.'); return }
    setSending(true)
    setSendError('')
    try {
      const subject = isThankYou
        ? `Thank you for chatting with ClubSheIs`
        : `ClubSheIs Proposal for ${client.brand || client.name}`

      const body = isThankYou
        ? emailContent
        : `Hi ${client.name},\n\nPlease find our proposal below. We've also attached our About Us document for your reference.\n\n---\n\n${emailContent}\n\n---\n\nLooking forward to hearing from you.\n\nWarm regards,\nNyaki & Kopano\nClubSheIs`

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.email,
          subject,
          body,
          attachAboutUs: !isThankYou,
          trackingId: !isThankYou ? client.id : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSent(true)
      await onSaveField('proposal', 'proposal_status', 'Sent')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send email')
    }
    setSending(false)
  }

  if (!emailContent) {
    return (
      <div className="text-center py-8 text-stone-400">
        <p className="text-sm">{isThankYou ? 'No thank-you email prepared yet.' : 'No proposal generated yet.'}</p>
        <p className="text-xs mt-1">Go back to the Discovery Call stage and click the appropriate button first.</p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    'Draft': 'bg-stone-100 text-stone-600',
    'Sent': 'bg-blue-100 text-blue-700',
    'Viewed': 'bg-purple-100 text-purple-700',
    'Accepted': 'bg-green-100 text-green-700',
    'Declined': 'bg-red-100 text-red-700',
    'Revising': 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="space-y-4">
      {/* Proposal status — above everything */}
      {!isThankYou && (
        <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg px-4 py-3">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider shrink-0">Proposal Status</label>
          <select
            value={proposalStatus}
            onChange={e => handleStatusChange(e.target.value)}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer ${statusColors[proposalStatus] || 'bg-stone-100 text-stone-600'}`}
          >
            {['Draft', 'Sent', 'Viewed', 'Accepted', 'Declined', 'Revising'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {proposalStatus === 'Viewed' && (
            <span className="text-xs text-purple-600 ml-auto">Client opened the email</span>
          )}
        </div>
      )}

      {/* Email type indicator */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isThankYou ? 'bg-rose-50 border border-rose-200' : 'bg-blue-50 border border-blue-200'}`}>
        <span className="text-sm">{isThankYou ? '💌' : '📄'}</span>
        <span className={`text-xs font-semibold uppercase tracking-wider ${isThankYou ? 'text-rose-600' : 'text-blue-600'}`}>
          {isThankYou ? 'Thank You Email' : 'Proposal Email'}
        </span>
        <span className="text-xs text-stone-400 ml-auto">To: {client.email || 'No email set'}</span>
      </div>

      {/* Email content card */}
      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <div className="bg-stone-50 px-4 py-3 flex items-center justify-between border-b border-stone-200">
          <div>
            <h4 className="text-sm font-semibold text-stone-900">
              {isThankYou ? 'Thank You Email' : `Proposal for ${client.brand || client.name}`}
            </h4>
            <p className="text-xs text-stone-500">Review and edit before sending</p>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <button
                onClick={() => { setEditDraft(savedContent); setEditing(true) }}
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

        <EmailContentEditor content={emailContent} onChange={setEditDraft} readOnly={!editing} />
      </div>

      {/* About Us PDF attachment — only for proposals */}
      {!isThankYou && (
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
      )}

      {/* Send button */}
      {sent ? (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4 text-center">
          <p className="text-sm font-semibold text-green-700">
            ✓ {isThankYou ? 'Thank you email' : 'Proposal'} sent to {client.email}
          </p>
          <p className="text-xs text-green-600 mt-1">
            Sent from info@clubsheis.com{!isThankYou && ' with About Us PDF attached'}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
          <div className="flex-1">
            <p className="text-xs text-stone-500">
              Sends from <strong>info@clubsheis.com</strong> as Nyaki & Kopano
              {!isThankYou && ' with the About Us PDF attached'}.
            </p>
            {sendError && (
              <p className="text-xs text-red-600 mt-1">{sendError}</p>
            )}
          </div>
          <button
            onClick={handleSendEmail}
            disabled={!client.email || editing || sending}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0 ml-4 text-white ${
              isThankYou ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#B45309] hover:bg-amber-800'
            }`}
          >
            {sending ? 'Sending...' : isThankYou ? 'Send Thank You Email' : 'Send Proposal via Email'}
          </button>
        </div>
      )}
    </div>
  )
}


// ── Edit Client Modal ──
function EditClientModal({
  client,
  onClose,
  onSave,
}: {
  client: Client
  onClose: () => void
  onSave: (updates: Partial<Client>) => Promise<void>
}) {
  const [form, setForm] = useState({
    name: client.name || '',
    brand: client.brand || '',
    email: client.email || '',
    phone: client.phone || '',
    website: client.website || '',
    socials: client.socials || '',
    needs: client.needs || '',
    budget_range: client.budget_range || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const inputClass = "w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20 bg-white"

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-stone-900 text-lg">Edit Client Details</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl cursor-pointer">×</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Contact Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Business / Brand</label>
              <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className={inputClass} placeholder="Company or brand" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="Primary email" />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="WhatsApp or phone" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Website</label>
              <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Social Handles</label>
              <input value={form.socials} onChange={e => setForm(f => ({ ...f, socials: e.target.value }))} className={inputClass} placeholder="Instagram, LinkedIn, etc." />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">What They Need</label>
            <textarea value={form.needs} onChange={e => setForm(f => ({ ...f, needs: e.target.value }))} className={`${inputClass} resize-none`} rows={3} placeholder="Notes from call" />
          </div>

          <div>
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Budget Range</label>
            <select value={form.budget_range} onChange={e => setForm(f => ({ ...f, budget_range: e.target.value }))} className={inputClass}>
              <option value="">Select range</option>
              <option value="Under R5,000">Under R5,000</option>
              <option value="R5,000 – R15,000">R5,000 – R15,000</option>
              <option value="R15,000 – R30,000">R15,000 – R30,000</option>
              <option value="R30,000+">R30,000+</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving || !form.name}
            className="bg-[#B45309] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="border border-stone-200 text-stone-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
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
  const [showEditClient, setShowEditClient] = useState(false)
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

  // Handle legacy stage keys that were renamed
  const stageKeyMap: Record<string, string> = { 'page-build': 'copy-bible' }
  let resolvedStage = stageKeyMap[client.current_stage] || client.current_stage

  // If the stage doesn't exist in active stages, reset to Implementation Plan
  if (!activeStageKeys.includes(resolvedStage)) {
    resolvedStage = 'implementation-plan'
  }

  const currentIdx = activeStageKeys.indexOf(resolvedStage)

  // If the stored stage needs updating, update it in the DB
  if (resolvedStage !== client.current_stage) {
    updateClient(client.id, { current_stage: resolvedStage } as Partial<Client>)
    setClient(prev => prev ? { ...prev, current_stage: resolvedStage } : prev)
  }

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
            {client.email && <span className="text-xs text-stone-400">✉ {client.email}</span>}
            {client.phone && <span className="text-xs text-stone-400">☎ {client.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEditClient(true)}
            className="text-xs text-stone-500 hover:text-[#B45309] border border-stone-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Edit Client
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="text-xs text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
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
        {STAGES.filter(s => activeStageKeys.includes(s.key)).map((stage, idx, arr) => {
          // Phase headings
          const PHASES: Record<string, { label: string; color: string; bg: string; border: string }> = {
            'discovery': { label: 'Onboarding', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
            'strategy': { label: 'Planning & Strategy', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
            'funnel-map': { label: 'Pre-Production', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
            'production': { label: 'Production', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
            'internal-check': { label: 'Delivery and Hand Over', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
          }
          const phase = PHASES[stage.key]
          const stageIdx = activeStageKeys.indexOf(stage.key)
          const isCurrent = stage.key === resolvedStage
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
            <div key={stage.key} id={`stage-${stage.key}`}>
              {phase && (
                <div className={`${phase.bg} ${phase.border} border rounded-lg px-4 py-2.5 mb-3 flex items-center gap-2`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${phase.color.replace('text-', 'bg-')}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${phase.color}`}>{phase.label}</span>
                </div>
              )}
              <StagePanel
                stage={stage}
                isActive={isActive}
                isCurrent={isCurrent}
                isCompleted={isCompleted}
                completions={completions}
                fieldValues={fieldValues}
                onToggleSubstep={handleToggleSubstep}
                onSaveField={handleSaveField}
                onAdvance={async () => { if (nextStageKey) await handleAdvance(nextStageKey) }}
                canAdvance={allDone && !!nextStageKey && !(stage.key === 'awaiting-review' && fieldValues.get('awaiting-review:proposal_status') === 'Declined')}
                nextStageName={nextStage?.name || 'Next'}
                actionSlot={
                  stage.key === 'discovery' ? (
                    <DiscoveryActions
                      leadStatus={fieldValues.get('discovery:lead_status') || ''}
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                      onAdvance={async () => { if (nextStageKey) await handleAdvance(nextStageKey) }}
                    />
                  ) : stage.key === 'proposal' ? (
                    <ProposalReview
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                      onAdvance={async () => { if (nextStageKey) await handleAdvance(nextStageKey) }}
                    />
                  ) : stage.key === 'awaiting-review' ? (
                    <AwaitingReviewActions
                      client={client}
                      fieldValues={fieldValues}
                      onAdvance={async () => { if (nextStageKey) await handleAdvance(nextStageKey) }}
                    />
                  ) : stage.key === 'onboarding' ? (
                    <OnboardingActions
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                    />
                  ) : stage.key === 'strategy' ? (
                    <StrategyActions
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                    />
                  ) : stage.key === 'funnel-strategy' ? (
                    <FunnelStrategyActions
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                      onAdvance={async () => { if (nextStageKey) await handleAdvance(nextStageKey) }}
                    />
                  ) : stage.key === 'implementation-plan' ? (
                    <ImplementationPlanActions
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                      onAdvance={async () => { if (nextStageKey) await handleAdvance(nextStageKey) }}
                    />
                  ) : stage.key === 'funnel-map' ? (
                    <FunnelMapActions
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                      onAdvance={async () => { if (nextStageKey) await handleAdvance(nextStageKey) }}
                    />
                  ) : stage.key === 'copy-bible' ? (
                    <CopyBibleActions
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                    />
                  ) : stage.key === 'brand-bible' ? (
                    <BrandBibleActions
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                      onAdvance={async () => { if (nextStageKey) await handleAdvance(nextStageKey) }}
                    />
                  ) : stage.key === 'production' ? (
                    <ProductionActions
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                    />
                  ) : stage.key === 'internal-check' ? (
                    <InternalCheckActions
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                    />
                  ) : stage.key === 'handover' ? (
                    <HandOverActions
                      client={client}
                      fieldValues={fieldValues}
                      onSaveField={handleSaveField}
                    />
                  ) : undefined
                }
                actionSlotFullWidth={stage.key === 'proposal' || stage.key === 'awaiting-review' || stage.key === 'onboarding' || stage.key === 'strategy' || stage.key === 'funnel-strategy' || stage.key === 'implementation-plan' || stage.key === 'funnel-map' || stage.key === 'copy-bible' || stage.key === 'brand-bible' || stage.key === 'production' || stage.key === 'internal-check' || stage.key === 'handover'}
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

      {/* Edit Client modal */}
      {showEditClient && (
        <EditClientModal
          client={client}
          onClose={() => setShowEditClient(false)}
          onSave={async (updates) => {
            await updateClient(id, updates)
            setClient(prev => prev ? { ...prev, ...updates } : prev)
            setShowEditClient(false)
          }}
        />
      )}

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
