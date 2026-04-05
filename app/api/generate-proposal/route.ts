import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not set. Add it to your Vercel environment variables.' }, { status: 500 })
    }

    const { clientName, brandName, email, needs, transcriptNotes, budgetRange } = await req.json()

    const anthropic = new Anthropic({ apiKey })

    const prompt = `You are writing a proposal for ClubSheIs, a digital marketing and content production agency based in South Africa. Generate a professional, warm, and clear proposal based on the discovery call information below.

CLIENT INFORMATION:
- Name: ${clientName}
- Brand: ${brandName || 'Not specified'}
- Email: ${email || 'Not specified'}
- Budget Range: ${budgetRange || 'Not specified'}

DISCOVERY CALL NOTES / WHAT THEY NEED:
${needs || 'No notes provided'}

TRANSCRIPT NOTES:
${transcriptNotes || 'No transcript provided'}

Write the proposal in this structure:
1. **Opening** — Personalised greeting referencing something specific from the call. Show you listened.
2. **Understanding Your Needs** — Summarise what they told us they need, in our words. Reflect their goals back to them.
3. **What We Recommend** — Based on their needs, recommend the right ClubSheIs package(s). Our packages are:
   - Ghutte Only (R3,800/month) — Platform onboarding, training, monthly strategy session
   - New Page Build (from R5,000) — Single landing/sales/opt-in page connected inside Ghutte
   - Content Day (from R8,500) — Long and short form videos shot in studio, full pre-production pipeline
   - Ads + Email + Social (from R12,500/month) — META ads, email newsletters, social content management (can be any combination)
   - Full Build (from R32,500) — 3-step funnel: Lead Magnet, OTO, Main Product page
4. **Scope & Deliverables** — Bullet list of exactly what they'll receive.
5. **Investment** — Pricing (suggest based on their budget range and needs). Include payment terms.
6. **Timeline** — When we can start and key milestones.
7. **Next Steps** — Clear call to action.

Keep the tone professional but human — like a smart friend who happens to be great at marketing. Not corporate. Not salesy. Just clear and confident. Keep it concise — no longer than 600 words.

Output ONLY the proposal text in clean markdown format. No preamble.`

    // Use streaming to avoid Vercel timeout
    const stream = await anthropic.messages.stream({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    // Collect the full response from the stream
    let proposalText = ''
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        proposalText += event.delta.text
      }
    }

    return Response.json({ proposal: proposalText })
  } catch (error) {
    console.error('Proposal generation error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: `Failed to generate proposal: ${msg}` }, { status: 500 })
  }
}
