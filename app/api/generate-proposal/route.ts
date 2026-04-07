import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not set.' }, { status: 500 })
    }

    const { clientName, brandName, email, needs, transcriptNotes, budgetRange, overridePackage, additionalNotes } = await req.json()

    // Trim transcript to avoid huge payloads
    const transcript = (transcriptNotes || '').slice(0, 5000)
    const clientNeeds = (needs || '').slice(0, 3000)

    const prompt = `You are writing a client proposal for ClubSheIs, a digital marketing and content production agency in South Africa run by Nyaki and Kopano.

CLIENT INFO:
- Name: ${clientName}
- Brand: ${brandName || 'Not specified'}
- Budget: ${budgetRange || 'Not discussed'}

DISCOVERY CALL NOTES:
${clientNeeds || 'No notes provided'}

CALL TRANSCRIPT/LINK:
${transcript || 'Not provided'}

IMPORTANT: Do NOT just copy the transcript or notes. Analyse what the client needs and write a professional, personalised proposal. Reference specific things from the call to show you listened.

OUR PACKAGES (choose the most suitable based on the discovery call):

1. SMALL BUSINESS - BRONZE (R3,800/month)
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
   - Best for: clients launching a new product/offer who need a complete funnel

PACKAGES & PAYMENT LINK: https://www.clubsheis.com/products
${overridePackage ? `\nIMPORTANT — USE THIS PACKAGE: The team has specifically chosen "${overridePackage}" for this client. Recommend this package in the proposal and explain why it fits.\n` : ''}${additionalNotes ? `\nADDITIONAL INSTRUCTIONS FROM THE TEAM:\n${additionalNotes}\n\nFollow these instructions carefully when writing the proposal.\n` : ''}
Write in this structure:

# Proposal for [Brand]

## Hi [Name],
Opening — reference something specific from the call. Show you listened. Make it personal and warm.

## Understanding Your Needs
Summarise what they need IN YOUR OWN WORDS. Show you understand their business, challenges, and goals. Do not paste their notes.

## What We Recommend
Recommend the right package(s) and explain WHY it fits their specific situation. Reference their goals and how this package addresses them. If two packages could work, present both as options.

## Scope & Deliverables
Bullet list of exactly what they receive with the recommended package.

## Investment
- Package name and exact price from the list above
- Payment terms: 50% deposit, 50% on completion for once-off builds. Monthly packages billed monthly via EFT or Paystack.
- ALWAYS include this line: "View packages and pay here: https://www.clubsheis.com/products"

## Timeline
When we start and key milestones. Be specific (e.g. "Week 1: Onboarding and strategy session. Week 2-3: Build. Week 4: Review and launch.")

## Next Steps
1. Review this proposal
2. Choose your package at https://www.clubsheis.com/products
3. Once payment is confirmed, we'll send your onboarding form within 24 hours

TONE: Professional but human — like a smart friend who's great at marketing. Not corporate. Not salesy. Confident and clear. South African context.

Keep it under 600 words. Output ONLY the proposal in clean markdown. No preamble or explanation.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
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
