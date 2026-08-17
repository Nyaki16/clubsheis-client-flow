'use client'

import { useState } from 'react'
import type { ProposalData, PricingCard } from '@/lib/proposal-template'

const INPUT = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-[#B45309]/20 bg-white'
const LABEL = 'block text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1'

function Field({ label, value, onChange, placeholder, mono }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${INPUT}${mono ? ' font-mono' : ''}`}
      />
    </div>
  )
}

function Area({ label, value, onChange, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className={`${INPUT} leading-relaxed`}
      />
    </div>
  )
}

/** Add / remove / reorder-free list of plain strings. */
function StringList({ label, items, onChange, rows = 2, addLabel }: {
  label: string; items: string[]; onChange: (v: string[]) => void; rows?: number; addLabel: string
}) {
  const set = (i: number, v: string) => onChange(items.map((it, n) => (n === i ? v : it)))
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-[11px] text-stone-400 font-mono pt-2.5 w-5 shrink-0">
              {String(i + 1).padStart(2, '0')}
            </span>
            <textarea
              value={item}
              onChange={e => set(i, e.target.value)}
              rows={rows}
              className={`${INPUT} leading-relaxed`}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, n) => n !== i))}
              className="text-stone-300 hover:text-red-500 text-lg leading-none pt-1.5 px-1 shrink-0"
              title="Remove"
            >×</button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="mt-2 text-xs font-medium text-[#B45309] hover:underline"
      >+ {addLabel}</button>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200">
        <h4 className="text-sm font-semibold text-stone-700">{title}</h4>
        {hint && <p className="text-[11px] text-stone-400 mt-0.5">{hint}</p>}
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  )
}

function CardEditor({ card, index, total, onChange, onRemove }: {
  card: PricingCard; index: number; total: number
  onChange: (c: PricingCard) => void; onRemove: () => void
}) {
  const set = <K extends keyof PricingCard>(k: K, v: PricingCard[K]) => onChange({ ...card, [k]: v })
  return (
    <div className="border border-stone-200 rounded-lg p-4 space-y-3 bg-stone-50/50">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#B45309]">
          Card {index + 1} of {total}
        </span>
        {total > 1 && (
          <button type="button" onClick={onRemove} className="text-xs text-stone-400 hover:text-red-500">
            Remove card
          </button>
        )}
      </div>

      <Field
        label="Phase label (leave blank for a single package)"
        value={card.eyebrow}
        onChange={v => set('eyebrow', v)}
        placeholder="Phase One · Foundation · Months 1 to 3"
      />
      <Field label="Package name" value={card.name} onChange={v => set('name', v)} placeholder="Small Business Gold (OBM)" />
      <Field label="Subtitle" value={card.subtitle} onChange={v => set('subtitle', v)} placeholder="System build, strategy, and launch readiness" />

      <div className="grid grid-cols-3 gap-3">
        <Field label="Price" value={card.price} onChange={v => set('price', v)} placeholder="R7,500" mono />
        <Field label="Cadence" value={card.cadence} onChange={v => set('cadence', v)} placeholder="per month" />
        <Field label="Total note" value={card.totalNote} onChange={v => set('totalNote', v)} placeholder="3 months · R22,500 total" />
      </div>

      <StringList
        label="Deliverables"
        items={card.features}
        onChange={v => set('features', v)}
        rows={2}
        addLabel="Add deliverable"
      />
    </div>
  )
}

const BLANK_CARD: PricingCard = {
  eyebrow: '', name: '', subtitle: '', price: '', cadence: 'per month', totalNote: '', features: [''],
}

/**
 * Structured editor for a generated proposal.
 *
 * The PDF renders pricing cards from real fields (price, term, deliverables),
 * so the team edits those fields directly rather than editing prose that would
 * then have to be parsed back into numbers.
 */
export default function ProposalEditor({ data, onSave, saving, pdfUrl }: {
  data: ProposalData
  onSave: (next: ProposalData) => Promise<void> | void
  saving?: boolean
  pdfUrl?: string
}) {
  const [draft, setDraft] = useState<ProposalData>(data)
  const [dirty, setDirty] = useState(false)

  const set = <K extends keyof ProposalData>(k: K, v: ProposalData[K]) => {
    setDraft(d => ({ ...d, [k]: v }))
    setDirty(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-stone-500">
          These fields drive the PDF. Prices are used exactly as typed.
        </p>
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:border-stone-300"
            >
              Preview PDF ↗
            </a>
          )}
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={async () => { await onSave(draft); setDirty(false) }}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-[#B45309] text-white disabled:opacity-40"
          >
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      {dirty && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Unsaved changes — save before previewing or sending, or the PDF will still show the previous version.
        </p>
      )}

      <Section title="Cover" hint="The headline splits in two — the second half is set in maroon.">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Headline — first half"
            value={draft.headlineLead}
            onChange={v => set('headlineLead', v)}
            placeholder="A strategy for launching "
          />
          <Field
            label="Headline — accent half"
            value={draft.headlineAccent}
            onChange={v => set('headlineAccent', v)}
            placeholder="Luminara Investments"
          />
        </div>
      </Section>

      <Section title="Section One · The opportunity" hint="The recap of the discovery call, in our words.">
        <Area label="Intro" value={draft.opportunityLead} onChange={v => set('opportunityLead', v)} rows={3} />
        <StringList
          label="Paragraphs"
          items={draft.opportunityParagraphs}
          onChange={v => set('opportunityParagraphs', v)}
          rows={5}
          addLabel="Add paragraph"
        />
      </Section>

      <Section title="Section Three · What we'll do together">
        <Area label="Intro" value={draft.planLead} onChange={v => set('planLead', v)} rows={2} />
        <div className="space-y-3">
          <label className={LABEL}>Phases</label>
          {draft.phases.map((p, i) => (
            <div key={i} className="border border-stone-200 rounded-lg p-3 space-y-2 bg-stone-50/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#B45309]">Phase {i + 1}</span>
                {draft.phases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => set('phases', draft.phases.filter((_, n) => n !== i))}
                    className="text-xs text-stone-400 hover:text-red-500"
                  >Remove</button>
                )}
              </div>
              <Field
                label="Title"
                value={p.title}
                onChange={v => set('phases', draft.phases.map((x, n) => n === i ? { ...x, title: v } : x))}
                placeholder="Phase One · Foundation · Months 1 to 3"
              />
              <Area
                label="Body"
                value={p.body}
                onChange={v => set('phases', draft.phases.map((x, n) => n === i ? { ...x, body: v } : x))}
                rows={5}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => set('phases', [...draft.phases, { title: '', body: '' }])}
            className="text-xs font-medium text-[#B45309] hover:underline"
          >+ Add phase</button>
        </div>
      </Section>

      <Section title="Section Four · The investment" hint="One card per package, or one per phase on a phased build.">
        <Area label="Intro" value={draft.investmentLead} onChange={v => set('investmentLead', v)} rows={2} />
        <Area label="Note under the intro" value={draft.investmentNote} onChange={v => set('investmentNote', v)} rows={3} />
        <div className="space-y-3">
          {draft.cards.map((c, i) => (
            <CardEditor
              key={i}
              card={c}
              index={i}
              total={draft.cards.length}
              onChange={next => set('cards', draft.cards.map((x, n) => n === i ? next : x))}
              onRemove={() => set('cards', draft.cards.filter((_, n) => n !== i))}
            />
          ))}
          <button
            type="button"
            onClick={() => set('cards', [...draft.cards, { ...BLANK_CARD }])}
            className="text-xs font-medium text-[#B45309] hover:underline"
          >+ Add package card</button>
        </div>
      </Section>

      <Section title="Section Six · Ready to begin">
        <StringList
          label="Next steps"
          items={draft.nextSteps}
          onChange={v => set('nextSteps', v)}
          rows={2}
          addLabel="Add step"
        />
        <div className="space-y-2">
          <label className={LABEL}>Closing statement</label>
          {draft.closingLines.map((l, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={l.lead}
                onChange={e => set('closingLines', draft.closingLines.map((x, n) => n === i ? { ...x, lead: e.target.value } : x))}
                placeholder="Build the "
                className={INPUT}
              />
              <input
                value={l.accent}
                onChange={e => set('closingLines', draft.closingLines.map((x, n) => n === i ? { ...x, accent: e.target.value } : x))}
                placeholder="system."
                className={`${INPUT} text-[#70262D] font-semibold`}
              />
              <button
                type="button"
                onClick={() => set('closingLines', draft.closingLines.filter((_, n) => n !== i))}
                className="text-stone-300 hover:text-red-500 text-lg leading-none px-1 shrink-0"
                title="Remove"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set('closingLines', [...draft.closingLines, { lead: '', accent: '' }])}
            className="text-xs font-medium text-[#B45309] hover:underline"
          >+ Add line</button>
        </div>
        <Area label="Closing paragraph" value={draft.closingParagraph} onChange={v => set('closingParagraph', v)} rows={3} />
      </Section>

      <p className="text-[11px] text-stone-400">
        Who we are, our results, and the terms &amp; conditions are fixed for every proposal and are not editable here —
        they live in <code className="font-mono">lib/proposal-template.ts</code>.
      </p>
    </div>
  )
}
