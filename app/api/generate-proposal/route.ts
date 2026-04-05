import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not set.' }, { status: 500 })
    }

    const { clientName, brandName, email, needs, transcriptNotes, budgetRange } = await req.json()

    const prompt = `You are writing a proposal for ClubSheIs, a digital marketing and content production agency based in South Africa. Generate a professional, warm, and clear proposal.

CLIENT: ${clientName}${brandName ? ` (${brandName})` : ''} | Email: ${email || 'N/A'} | Budget: ${budgetRange || 'N/A'}

WHAT THEY NEED:
${needs || 'No notes'}

TRANSCRIPT:
${(transcriptNotes || '').slice(0, 2000)}

Structure:
1. **Opening** — Personalised greeting. Show you listened.
2. **Understanding Your Needs** — Reflect their goals back.
3. **What We Recommend** — Our packages:
   - Ghutte Only (R3,800/mo) — Platform onboarding, training, monthly strategy
   - New Page Build (from R5,000) — Single page in Ghutte
   - Content Day (from R8,500) — Long/short form video in studio
   - Ads + Email + Social (from R12,500/mo) — META ads, email, social (any combo)
   - Full Build (from R32,500) — 3-step funnel: Lead Magnet, OTO, Main Product
4. **Scope & Deliverables** — Bullet list.
5. **Investment** — Pricing + payment terms.
6. **Timeline** — Start date + milestones.
7. **Next Steps** — Clear CTA.

Tone: professional but human. Not corporate. Keep it under 500 words. Output ONLY the proposal in markdown. No preamble.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `${res.status} ${err}` }, { status: res.status })
    }

    const data = await res.json()
    const proposalText = data.content?.[0]?.text || ''

    return Response.json({ proposal: proposalText })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: `Failed to generate proposal: ${msg}` }, { status: 500 })
  }
}
