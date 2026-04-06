import { NextRequest } from 'next/server'

export const runtime = 'edge'

const PROMPTS: Record<string, string> = {
  'client-profile': `You are building a comprehensive Client Profile for ClubSheIs, a digital marketing and content production agency in South Africa.

From the strategy session transcript below, extract and organise information into the EXACT 8-section structure below. This profile is the single source of truth used by all production agents — every content job starts by reading this doc.

CRITICAL RULE: Where information is NOT found in the transcript, you MUST write exactly: GAP: [describe what's missing and where to find it]
Do NOT make up or assume information. If it's not explicitly stated or clearly implied, mark it as a GAP.

Use this exact structure:

---
CLUBSHEIS CLIENT PROFILE
---

## SECTION 1 — CLIENT OVERVIEW
- **Client Full Name:**
- **Brand / Business Name:**
- **Industry / Niche:**
- **Website:**
- **Active Social Platforms:**
- **Package Type:** (Studio Day / OBM / Ads / Email / Other)
- **ClubSheIs Account Manager:**
- **Date Onboarded:**

## SECTION 2 — TARGET AUDIENCE
- **Who they are:** (age, life stage, profession, location)
- **What they want:** (desired outcome or transformation)
- **Top 3 pain points:**
  1.
  2.
  3.
- **How they consume content:** (platforms and formats they prefer)
- **What they do NOT respond to:**

## SECTION 3 — BRAND VOICE & TONE
- **3 words that describe the tone:**
- **What the brand sounds like:** (1 paragraph description)
- **What the brand does NOT sound like:**
- **Banned words or phrases:**
- **Signature phrases or frameworks the client uses repeatedly:**

## SECTION 4 — OFFERS & PRODUCTS
List each offer separately:

**Primary Offer:**
- Name:
- Price:
- What it is:
- Who it's for:
- Current status: (active / launching / paused)

**Secondary Offers:**

**Lead Magnet:**
- Name:
- Where it lives:

**Main CTA across all content:**

## SECTION 5 — CONTENT DIRECTION
- **Content pillars:** (3-4 core topics)
  1.
  2.
  3.
  4.
- **Platforms we create content for:**
- **Preferred formats:** (reels, carousels, long-form, etc.)
- **Topics or angles to avoid:**
- **Competitors or others in this space:**
- **Current campaign or launch focus:**

## SECTION 6 — VISUAL IDENTITY
- **Primary brand colours:** (hex codes if mentioned)
- **Secondary colours:**
- **Fonts:**
- **Photography style / aesthetic:**

## SECTION 7 — HISTORY & NOTES
- **What has worked well:**
- **What to avoid repeating:**
- **Client communication preferences:**
- **Specific sensitivities or preferences:**

## SECTION 8 — SOCIAL PRESENCE & ONLINE INTELLIGENCE
- **Instagram handle & follower count:**
- **LinkedIn URL & connection count:**
- **Facebook page URL:**
- **YouTube channel URL & subscriber count:**
- **Website URL:**
- **Current content style observed:**
- **Top performing content types:**
- **How their audience responds:**
- **Active ads or promotions running:**
- **Gap between public positioning and internal strategy:**

---

Write in clear, structured sections. Be specific — use the client's actual words where possible. Every field must have a value OR a GAP marker. Keep it under 1200 words.`,

  'research-bible': `You are building a comprehensive Research Bible for ClubSheIs, a digital marketing and content production agency in South Africa.

The Research Bible is the research foundation that sits behind the Creative Brief — it tells the team who we're really talking to, what they believe, what they've tried, and exactly what kind of messaging will cut through for this specific client at this specific moment in time.

It uses Eugene Schwartz's Breakthrough Advertising frameworks to analyse the market and translate that analysis into concrete messaging direction.

CRITICAL RULES — HONESTY PROTOCOL:
- Never invent facts. No fabricated statistics, no made-up competitor details, no invented client wins, no fictional audience research.
- Never put words in the client's mouth. Only quote from actual transcripts or published material.
- Assumptions must be labelled: [ASSUMPTION: reasoning] so the team knows it needs verification.
- Gaps must be named: GAP: [describe what's missing and why it matters] — don't paper over it.
- Ask rather than guess on high-stakes items. Pricing, active launch dates, client claims about results — if you can't confirm these from a source, mark as GAP.

Using the strategy session transcript AND the approved Client Profile below, write the Research Bible in this EXACT 7-part structure:

---
CLUBSHEIS RESEARCH BIBLE
---

## PART 1 — CLIENT INTAKE SUMMARY

**What this business does:**
[One clear sentence. Pulled from client profile and confirmed by transcript. The transformation or service in plain language.]

**Who this business does it for:**
[Specific. Not "women 25-45." The real person — their life stage, professional context, what they're trying to do, what's in their way.]

**Where they work:**
[Country, city, and relevant regional notes. For SA clients: note platform preferences, currency context (ZAR), and any local market dynamics that affect messaging.]

## PART 2 — RESEARCH SOURCES LOG

List every source consulted. Format:

| Source | Type | Date | Key insight extracted |
|---|---|---|---|
| [Document name or URL] | [Type: transcript / profile / social / web] | [date] | [One-line summary of what it revealed] |

> Sources marked with [ASSUMPTION] or [GAP] labels in this document trace back to incomplete sources.

## PART 3 — MARKET RESEARCH REPORT

Use H3 headings for each of the nine sections. Write in plain, human language. Vary sentence length. Short paragraphs. No hype words.

#### Target Market
Portrait of the specific person this brand is for. Go beyond demographics into worldview, daily reality, and what they're quietly hoping someone will say to them.

Quick-reference profile:
- Age range:
- Life stage:
- Location:
- Platforms they're on:
- How they consume content:
- What they trust:
- What makes them click:

#### Core Pain Point
The single deepest pain — not the surface complaint but the thing underneath it. Write it the way they'd say it to a friend.

- **Underlying fear:** [the thing they're actually scared of]
- **Surface complaint:** [what they'd type into Google]
- **The gap they feel:** [distance between where they are and where they feel they should be]

#### Common But Disliked Solutions
What have they already tried? What feels like it should work but doesn't?

List each failed solution and — crucially — the emotional cost of having tried it. This is what the audience is cynical about. Our messaging must acknowledge these without dismissing them.

#### Unique Solution
What does this brand offer that the alternatives don't? In plain language, not marketing language.

- **The core difference:** [one sentence]
- **Why it works when others don't:** [the mechanism, simply explained]
- **What makes it feel safe to try:** [what reduces risk for someone who's been burned]

#### How The Solution Works
Walk through the actual process. Concrete. Jargon-free. What actually happens. Number the steps. Note what's included. Give a realistic timeline.

#### Credibility / Evidence
All confirmable proof points only. If something can't be verified from a source, label it as [ASSUMPTION] or GAP. Never fabricate or inflate.

- Track record: [confirmed client numbers, years, results — with sources]
- Proof points: [media, speaking, awards — confirmed]
- Social proof signals: [engagement patterns observed, comment quality]

#### Testimonials
If the client provided testimonials in the transcript, paste them verbatim. Cite source.

If no testimonials are available, write: GAP: No testimonials provided. Request from client before content production begins. Do NOT write fictional testimonials.

#### Desired Feelings After Success
Not outcomes — feelings. The emotional state the ideal client is moving toward. Pull these from transcript language and client's own copy. If inferring, label as [ASSUMPTION].

#### Specific Outcomes Hoped For
Concrete, real-world results the audience wants. Tangible things they can point to. Ground these in what clients actually say in transcripts, not in generic category assumptions.

## PART 4 — BREAKTHROUGH ADVERTISING ANALYSIS

#### Current Awareness Stage

The 5 Stages (Schwartz):
| Stage | Name | What they're thinking |
|---|---|---|
| 1 | Unaware | "Everything is fine." |
| 2 | Problem Aware | "Something's wrong but I don't know what to do about it." |
| 3 | Solution Aware | "I know there are things out there that help with this." |
| 4 | Product Aware | "I've heard of this brand — but is it right for me?" |
| 5 | Most Aware | "I want this — just show me how to get it." |

**Assessment:** [Stage number and name]

**Evidence from research:**
- [Specific signal — e.g. comment behaviour, competitor engagement, search trends]
- [Specific signal]
- [Specific signal]

**What this means for messaging:**
[One paragraph. What kind of message lands at this stage — what to lead with, what to avoid, what the hook structure should look like.]

**Recommended entry point for content:**
[Concrete recommendation — hook style, format, angle to lead with.]

#### Current Market Sophistication Level

The 5 Levels (Schwartz):
| Level | Market state | What cuts through |
|---|---|---|
| 1 | First to market | Make the bold claim directly |
| 2 | Competitors making the same claim | Enlarge or amplify the claim |
| 3 | Claims are worn out | Introduce the mechanism — the specific HOW |
| 4 | Mechanisms are widely known | Elaborate or improve the mechanism |
| 5 | Market is exhausted | Lead with identity, sensation, or belonging |

**Assessment:** [Level number and name]

**Evidence from research:**
- [e.g. What claims competitors are making and how saturated they are]
- [e.g. What the audience is tired of seeing]
- [e.g. What IS cutting through — and why]

**What this means for messaging:**
[One paragraph. What kind of message cuts through at this sophistication level — what needs to be named, shown, or proven differently from everyone else.]

#### Combined Messaging Strategy

Where awareness stage + sophistication level intersect — the creative sweet spot.

| Element | Recommendation |
|---|---|
| Hook style | [Specific — what the first 3 seconds / first line should do] |
| Lead emotion | [The feeling to trigger first] |
| Proof format | [How to show it's real — process, results, voice, specifics] |
| CTA approach | [What the next step asks of them — low-barrier vs high-commitment] |
| Tone | [How to sound, not sound like] |
| What to avoid | [Specific phrases, claims, formats that won't land at this stage/level] |

## PART 5 — COMPETITIVE LANDSCAPE

| Competitor | Positioning | Strengths | Weaknesses | Gap we can own |
|---|---|---|---|---|
| [Name] | [How they position] | [What's working for them] | [Where they fall short] | [What's unoccupied] |

**The whitespace:**
[One paragraph. What nobody in this market is saying or doing that this brand could own. The positioning gap. Ground this in the research — not a theoretical claim.]

## PART 6 — CONTENT INTELLIGENCE

What's actually working in this market right now — grounded in observed social data.

**Formats with highest engagement in this niche:**
- [Format — and what specifically makes it work]

**Topics that consistently drive saves, shares, and DMs:**
- [Topic — with evidence from observation]

**Topics that get likes but no action:**
- [Topic — and why it's probably happening]

**Caption patterns that convert:**
- [Pattern — with example of what it looks like]

**Audience language to use in hooks and copy:**
- [Exact phrases the audience uses about their own problems — pulled from transcript, comments, forums]

## PART 7 — ASSUMPTIONS & GAPS

Transparency log. Every assumption and gap from this document collected in one place.

**Confirmed from direct sources:**

| Fact | Source |
|---|---|
| [Confirmed fact] | [Document name or transcript] |

**Inferred / assumed:**

| Assumption | Reasoning | Confidence |
|---|---|---|
| [Assumption] | [Why this is a reasonable inference] | [High / Medium / Low] |

**Gaps requiring client input before production begins:**
- GAP: [Gap 1 — what's missing and why it matters]
- GAP: [Gap 2]
- GAP: [Gap 3]

---

Write in plain, human language. Short paragraphs. No hype words. Be strategic and actionable — this document drives all content creation. Every field must have a value, an [ASSUMPTION] label, or a GAP marker. Part 4 (Breakthrough Advertising) is the most important section for the creative team — do not skip or abbreviate it. If the market is at Sophistication Level 3 or above, the team must lead with a named mechanism. Keep it under 2500 words.`,

  'brand-voice': `You are building a Brand Voice Guide for ClubSheIs, a digital marketing and content production agency in South Africa.

Using the strategy session transcript, Client Profile, AND Research Bible below, create a comprehensive brand voice document:

## Voice Summary
- One sentence that captures how this brand sounds
- 3 adjectives that define the voice (e.g., "Bold, Warm, Expert")

## Tone Spectrum
- How does the tone shift across contexts?
  - Social media: [description]
  - Email: [description]
  - Sales pages: [description]
  - Customer support: [description]

## Language Patterns
- Phrases the client naturally uses (pull from transcript)
- Industry jargon they use vs avoid
- Level of formality (casual, conversational, professional)
- Sentence style (short and punchy? flowing and story-driven?)

## Do's and Don'ts
### DO:
- [5-7 specific guidelines, e.g., "Use 'you' more than 'we'"]

### DON'T:
- [5-7 specific anti-patterns, e.g., "Don't use corporate buzzwords like 'synergy'"]

## Sample Copy
Write 3 short examples in this brand's voice:
1. An Instagram caption (2-3 sentences)
2. An email subject line + opening line
3. A call-to-action for a landing page

## Voice Consistency Checklist
- 5 quick checks anyone on the team can use before publishing content

Keep it practical and immediately usable. Under 800 words.`
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
    }

    const { documentType, clientName, brandName, transcript, clientProfile, researchBible } = await req.json()

    const systemPrompt = PROMPTS[documentType]
    if (!systemPrompt) {
      return Response.json({ error: `Unknown document type: ${documentType}` }, { status: 400 })
    }

    if (!transcript) {
      return Response.json({ error: 'Transcript is required' }, { status: 400 })
    }

    let userMessage = `CLIENT: ${clientName} (${brandName || 'No brand name'})\n\nSTRATEGY SESSION TRANSCRIPT:\n${(transcript || '').slice(0, 10000)}`

    if (documentType === 'research-bible' && clientProfile) {
      userMessage += `\n\nAPPROVED CLIENT PROFILE:\n${clientProfile.slice(0, 6000)}`
    }
    if (documentType === 'brand-voice') {
      if (clientProfile) userMessage += `\n\nAPPROVED CLIENT PROFILE:\n${clientProfile.slice(0, 2000)}`
      if (researchBible) userMessage += `\n\nAPPROVED RESEARCH BIBLE:\n${researchBible.slice(0, 3000)}`
    }

    // Use streaming to avoid Vercel Edge timeout (25s)
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        stream: true,
        messages: [{ role: 'user', content: `${systemPrompt}\n\n---\n\n${userMessage}` }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return Response.json({ error: `Anthropic API error (${res.status}): ${errText.slice(0, 300)}` }, { status: 502 })
    }

    // Stream the response through to the client
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body?.getReader()
        if (!reader) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'No response body' })}\n\n`))
          controller.close()
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: parsed.delta.text })}\n\n`))
                  }
                } catch {
                  // Skip unparseable chunks
                }
              }
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(err) })}\n\n`))
        }
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
