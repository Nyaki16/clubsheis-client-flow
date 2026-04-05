import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
    }

    const { clientName, brandName, email, needs, transcriptNotes, budgetRange } = await req.json()

    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are writing a proposal for ClubSheIs, a digital marketing and content production agency based in South Africa. Generate a professional, warm, and clear proposal based on the discovery call information below.

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

Keep the tone professional but human — like a smart friend who happens to be great at marketing. Not corporate. Not salesy. Just clear and confident.

Output ONLY the proposal text in clean markdown format. No preamble.`,
        },
      ],
    })

    const proposalText = message.content[0].type === 'text' ? message.content[0].text : ''

    return Response.json({ proposal: proposalText })
  } catch (error) {
    console.error('Proposal generation error:', error)
    return Response.json({ error: 'Failed to generate proposal' }, { status: 500 })
  }
}
