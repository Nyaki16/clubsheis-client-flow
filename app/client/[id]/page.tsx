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
            <div key={stage.key} id={`stage-${stage.key}`}>
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
                  ) : undefined
                }
                actionSlotFullWidth={stage.key === 'proposal' || stage.key === 'awaiting-review'}
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
