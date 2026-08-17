import { NextRequest } from 'next/server'
import { PROPOSAL_JSON_SCHEMA } from '@/lib/proposal-template'

export const runtime = 'edge'

/** The price list is the source of truth — the model copies from it, never invents. */
const PACKAGES = `1. SMALL BUSINESS - BRONZE (R3,800/month)
   - Monthly access to Ghutte (our all-in-one marketing platform)
   - Video tutorials and monthly 1-hour strategy sessions
   - Best for: clients who want to run their own marketing with guidance

2. SMALL BUSINESS - SILVER (R5,500/month)
   - Platform access + 30-minute strategy calls
   - Unlimited platforms
   - Design/post creation: 12 feed posts monthly (4 reels, 8 static)
   - Excludes paid ads
   - Best for: clients who need content creation support

3. SMALL BUSINESS - GOLD / OBM (R7,500/month, minimum 3 months)
   - System workflow strategy
   - Ghutte migration
   - System building: sales workflows, email, social integration, ads setup
   - Personal training
   - Best for: clients who need their entire system built and optimised

4. OBM GROWTH SUPPORT (R12,500/month)
   - META ads management per product category
   - Website audits
   - Social media optimisation
   - List management
   - Email automation setup
   - Monthly check-in calls
   - Best for: clients ready to scale with ads and automation

5. OBM VISIBILITY & GROWTH - Ads + Email (R18,500/month)
   - META ads management
   - 2 monthly newsletters
   - Social optimisation
   - Website updates
   - Email automation
   - 60-minute monthly calls (check-in and strategy)
   - Best for: clients who want ads + email marketing managed

6. OBM VISIBILITY & GROWTH - Full (R25,000/month)
   - Meta ads management
   - 4 monthly newsletters
   - 16 weekly social posts
   - Email automation
   - Website optimisation
   - Dual 60-minute monthly calls
   - Best for: clients who want everything managed end-to-end

7. CUSTOM FULL FUNNEL BUILD (from R32,500 once-off)
   - Sales pages, email automation, ads setup
   - Personalised pricing based on scope
   - Best for: clients launching a new product/offer who need a complete funnel`

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not set.' }, { status: 500 })
    }

    const { clientName, brandName, needs, transcriptNotes, budgetRange, overridePackage, additionalNotes } = await req.json()

    // Trim transcript to avoid huge payloads
    const transcript = (transcriptNotes || '').slice(0, 5000)
    const clientNeeds = (needs || '').slice(0, 3000)

    const prompt = `You are writing a client proposal for Club She Is, a digital marketing and content production agency in South Africa run by Kopano Shimange and Nyaki Tshabangu.

CLIENT INFO:
- Name: ${clientName}
- Brand: ${brandName || 'Not specified'}
- Budget: ${budgetRange || 'Not discussed'}

DISCOVERY CALL NOTES:
${clientNeeds || 'No notes provided'}

CALL TRANSCRIPT/LINK:
${transcript || 'Not provided'}

IMPORTANT: Do NOT copy the transcript or notes back. Analyse what the client needs and write a personalised proposal. Reference specific things from the call so it is obvious you listened.

OUR PACKAGES (choose the most suitable based on the discovery call):

${PACKAGES}

PACKAGES & PAYMENT LINK: https://www.clubsheis.com/products
${overridePackage ? `\nIMPORTANT — USE THIS PACKAGE: The team has specifically chosen "${overridePackage}" for this client. Recommend this package and explain why it fits.\n` : ''}${additionalNotes ? `\nADDITIONAL INSTRUCTIONS FROM THE TEAM:\n${additionalNotes}\n\nFollow these instructions carefully.\n` : ''}
HOW TO FILL THE FIELDS:

- headlineLead / headlineAccent: the cover headline, split in two. The lead is the setup and must end with a trailing space, e.g. "A strategy for launching ". The accent is normally the brand name. Keep the whole headline under about eight words.

- opportunityLead + opportunityParagraphs: a recap of the discovery call in our words, so the client can see we understood them. Three to five substantial paragraphs. Name the specific things they told us — their role, their audience, what they have tried, what they said they are stuck on, the number or goal that matters to them. Be direct about the gap between where they are and where they want to be, without being unkind about it. This section is the reason the proposal lands, so give it real weight.

- planLead + phases: what we will actually do. Use two phases only when the engagement genuinely splits (build first, then grow). Otherwise use a single phase. Each phase body is one full paragraph of concrete work, not a bullet summary.

- investmentLead + investmentNote + cards: one card per package or phase.
  * price and name MUST be copied exactly from the price list above. Never invent, round, discount, or blend prices.
  * totalNote: only when a minimum term applies. It must contain the computed rand total, in the form "3 months · R22,500 total" — multiply the monthly price by the number of months. Never write a bare term like "minimum 3 months" with no total. When no minimum term applies, use an empty string.
  * eyebrow: when phased, the full label in the form "Phase One · Foundation · Months 1 to 3" — the phase number, a short name for the phase, and the month range, separated by middots. Never just "Phase One". When there is only one card, use an empty string.
  * features: the deliverables for that package, written for this client rather than copied verbatim from the list.

- nextSteps: five to seven concrete steps in order, starting with signing and ending with the work being underway.

- closingLines: two or three short lines that build to a point. Each has a lead (ending in a space) and an accent tail carrying the emphasis, e.g. lead "Build the " accent "system." Use their actual goal where you can.

- closingParagraph: two or three sentences, under 45 words in total. Warm, confident, no hard sell.

TONE: Professional but human — like a smart friend who is great at marketing. Not corporate, not salesy. Confident and clear. South African English (organise, optimise, programme). Use the rand symbol as R with a thousands separator.

Do not write any section about who Club She Is is, our services, our results, or the terms and conditions — those are fixed and added automatically. Only produce the client-specific fields.`

    // Streaming keeps the first byte well inside Vercel Edge's 25s limit; a
    // blocking request on a proposal this size would die in production.
    // The response is a single JSON object shaped by PROPOSAL_JSON_SCHEMA.
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: PROPOSAL_JSON_SCHEMA },
        },
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Anthropic API error:', errText)
      return Response.json({ error: `API error ${res.status}: ${errText.slice(0, 300)}` }, { status: res.status })
    }

    // Pipe Anthropic's raw SSE stream directly to the client — no re-encoding.
    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: `Failed: ${msg}` }, { status: 500 })
  }
}
