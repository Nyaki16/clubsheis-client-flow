import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not set.' }, { status: 500 })
    }

    const { clientName, brandName, email, needs, transcriptNotes, budgetRange } = await req.json()

    // Trim transcript to avoid huge payloads
    const transcript = (transcriptNotes || '').slice(0, 3000)
    const clientNeeds = (needs || '').slice(0, 2000)

    const prompt = `You are writing a client proposal for ClubSheIs, a digital marketing and content production agency in South Africa run by Nyaki and Kopano.

CLIENT INFO:
- Name: ${clientName}
- Brand: ${brandName || 'Not specified'}
- Budget: ${budgetRange || 'Not discussed'}

DISCOVERY CALL NOTES:
${clientNeeds || 'No notes provided'}

CALL TRANSCRIPT/LINK:
${transcript || 'Not provided'}

IMPORTANT: Do NOT just copy the transcript or notes. Analyse what the client needs and write a professional, personalised proposal.

OUR PACKAGES:
- Ghutte Only (R3,800/mo) — Platform onboarding, training, monthly strategy
- New Page Build (from R5,000) — Single landing/sales/opt-in page in Ghutte
- Content Day (from R8,500) — Long & short form videos in studio, full pre-production
- Ads + Email + Social (from R12,500/mo) — META ads, email newsletters, social management (any combo)
- Full Build (from R32,500) — 3-step funnel: Lead Magnet + OTO + Main Product page

Write in this structure:
# Proposal for [Brand]
## Hi [Name],
Opening — reference something specific from the call. Show you listened.

## Understanding Your Needs
Summarise what they need IN YOUR OWN WORDS. Do not paste their notes.

## What We Recommend
Recommend the right package(s) and explain why it fits their situation.

## Scope & Deliverables
Bullet list of exactly what they receive.

## Investment
Pricing with payment terms (50% deposit, 50% on completion, EFT or Paystack).

## Timeline
When we start and key milestones (typically 4 weeks).

## Next Steps
Clear call to action.

TONE: Professional but human — like a smart friend who's great at marketing. Not corporate. Not salesy. Confident and clear.

Keep it under 500 words. Output ONLY the proposal in clean markdown. No preamble or explanation.`

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
      const errText = await res.text()
      console.error('Anthropic API error:', errText)
      return Response.json({ error: `API error ${res.status}: ${errText}` }, { status: res.status })
    }

    const data = await res.json()
    const proposalText = data.content?.[0]?.text || ''

    if (!proposalText) {
      return Response.json({ error: 'AI returned empty response' }, { status: 500 })
    }

    return Response.json({ proposal: proposalText })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: `Failed: ${msg}` }, { status: 500 })
  }
}
