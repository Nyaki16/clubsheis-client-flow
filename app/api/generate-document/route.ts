import { NextRequest } from 'next/server'

export const runtime = 'edge'

const PROMPTS: Record<string, string> = {
  'client-profile': `You are building a comprehensive Client Profile for ClubSheIs, a digital marketing and content production agency in South Africa.

From the strategy session transcript below, extract and organise information into the EXACT 8-section structure below. This profile is the single source of truth used by all production agents — every content job starts by reading this doc.

CRITICAL RULES:
1. Where information IS found in the transcript — write it in DEEP DETAIL. Use the client's exact words. Don't summarise what they said in one line — expand on it with full context, nuance, and supporting quotes.
2. Where information is NOT directly stated but can be REASONABLY INFERRED from what the client said, their industry, their audience, or their niche — write a detailed AI-generated assumption marked as: [ASSUMPTION: your reasoning based on what was said]
3. Where information genuinely CANNOT be inferred at all — mark it as: GAP: [describe what's missing and where to find it]
4. ALWAYS lean toward making intelligent assumptions rather than leaving gaps. The Research Bible depends on this profile being rich and detailed. A thin profile produces a thin Research Bible.
5. For each section, write PARAGRAPHS not just single lines. Explain the context, the implications, and how it connects to their business goals.

Use this exact structure:

---
CLUBSHEIS CLIENT PROFILE
---

## SECTION 1 — CLIENT OVERVIEW
- **Client Full Name:**
- **Brand / Business Name:**
- **Industry / Niche:** [Don't just name the niche — describe the specific corner of it they occupy, what makes their positioning different, and how they see themselves in the market. Use their words.]
- **Website:**
- **Active Social Platforms:** [List each platform and note what they use it for — e.g. Instagram for visibility, LinkedIn for credibility, WhatsApp for sales]
- **Package Type:** (Studio Day / OBM / Ads / Email / Other)
- **ClubSheIs Account Manager:**
- **Date Onboarded:**
- **Business Stage:** [Startup / Growing / Established / Scaling — infer from what they said about their journey]
- **Business Model:** [How they make money — 1:1 services, courses, products, speaking, consulting, etc. Detail each revenue stream mentioned or implied]

## SECTION 2 — TARGET AUDIENCE
- **Who they are:** Write a detailed paragraph — not just demographics but psychographics. What does this person's day look like? What are they thinking about at night? What's their relationship with money, ambition, self-image? Use clues from the transcript to paint a full picture. If the client described their ideal client, quote them directly and then expand.
- **What they want:** The transformation in their own words, plus what that transformation really means emotionally. Don't just say "grow their business" — describe the specific version of success they're chasing.
- **Top 5 pain points:** [Expand to 5. For each pain point, write 2-3 sentences explaining the context, why it matters, and how it shows up in their daily life]
  1.
  2.
  3.
  4.
  5.
- **What motivates them to take action:** [What would make them finally invest / sign up / commit? What's the tipping point?]
- **How they consume content:** [Platforms, formats, time of day, what kind of content stops their scroll, what they save vs share vs ignore]
- **What they do NOT respond to:** [What turns them off? What feels inauthentic to this audience? What have they seen too much of?]
- **Buying objections:** [What would stop them from buying? Price sensitivity, trust issues, past experiences, timing?] [ASSUMPTION if needed]

## SECTION 3 — BRAND VOICE & TONE
- **3 words that describe the tone:**
- **What the brand sounds like:** Write a full paragraph. Describe the personality as if you're describing a person. How do they talk? What's their energy? Are they the wise friend, the no-nonsense coach, the warm mentor? Use specific examples from the transcript — quote phrases they used naturally.
- **What the brand does NOT sound like:** Another full paragraph. What would feel fake or wrong? Corporate jargon? Overly casual? Too salesy? Too gentle?
- **Banned words or phrases:** [List any the client mentioned, plus infer what wouldn't fit based on their tone]
- **Signature phrases or frameworks the client uses repeatedly:** [Pull every recurring phrase, analogy, or framework from the transcript. These are gold for content creation.]
- **Communication style observed:** [How did they communicate in the session? Fast-talker? Thoughtful pauses? Story-driven? Data-driven? This reveals their natural content style.]

## SECTION 4 — OFFERS & PRODUCTS
List each offer separately with FULL detail:

**Primary Offer:**
- Name:
- Price:
- What it is: [Full description — not one line. What's included, how it's delivered, how long it takes, what the outcome is]
- Who it's for: [Specific person, not generic]
- Why it works: [What makes this offer compelling? What problem does it solve better than alternatives?]
- Current status: (active / launching / paused)
- How they currently sell it: [Through DMs? Sales calls? Website? Referrals?]

**Secondary Offers:** [Detail each one the same way]

**Lead Magnet:**
- Name:
- What it is:
- Where it lives:
- How it connects to the primary offer:

**Main CTA across all content:**
**Sales process:** [How does someone go from seeing their content to becoming a paying client? Map the journey based on what they described]

## SECTION 5 — CONTENT DIRECTION
- **Content pillars:** [4-5 core topics. For each pillar, write 2-3 sentences explaining WHY this topic matters to their audience and what angle to take]
  1.
  2.
  3.
  4.
  5.
- **Platforms we create content for:** [With notes on the strategy for each platform]
- **Preferred formats:** [reels, carousels, long-form, etc. — and why these work for their audience]
- **Topics or angles to avoid:** [With context on why]
- **Competitors or others in this space:** [Name them. What are they doing well? What are they doing badly? Where's the gap? Use [ASSUMPTION] if inferring from niche knowledge]
- **Current campaign or launch focus:**
- **Content that has worked before:** [Anything they mentioned getting good engagement on]
- **What their audience is asking for:** [Questions, DMs, comments — what does their audience want to see?]

## SECTION 6 — VISUAL IDENTITY
- **Primary brand colours:** (hex codes if mentioned, or describe the palette based on what they said)
- **Secondary colours:**
- **Fonts:**
- **Photography style / aesthetic:** [Write a full description — moody and editorial? Bright and clean? Raw and authentic? Professional but approachable?]
- **Visual references:** [Any brands, accounts, or styles they referenced as inspiration]
- **What their visuals should NOT look like:** [ASSUMPTION based on brand positioning]

## SECTION 7 — HISTORY & NOTES
- **Their journey:** [How did they get here? What's their backstory? This often comes out in strategy sessions and is crucial for storytelling content]
- **What has worked well:** [With detail on why it worked]
- **What to avoid repeating:** [With detail on why it didn't work]
- **Client communication preferences:**
- **Specific sensitivities or preferences:** [Topics to handle carefully, personal boundaries, things they're passionate about]
- **Key quotes from the session:** [Pull 5-10 of the most powerful, authentic things they said — these can be used directly in content]

## SECTION 8 — SOCIAL PRESENCE & ONLINE INTELLIGENCE
- **Instagram handle & follower count:**
- **LinkedIn URL & connection count:**
- **Facebook page URL:**
- **YouTube channel URL & subscriber count:**
- **Website URL:**
- **Current content style observed:** [Based on what they described — write a paragraph about what their current content looks like and feels like]
- **Top performing content types:** [What's worked for them?]
- **How their audience responds:** [Engagement patterns, DM patterns, comment quality]
- **Active ads or promotions running:**
- **Gap between public positioning and internal strategy:** [What they say publicly vs what they told you in the session — this reveals the real opportunity]
- **Growth trajectory:** [Where are they headed? What's the 6-12 month vision?] [ASSUMPTION if needed]

---

Write in DEEP DETAIL. This is the single source of truth for all content production. Use the client's actual words wherever possible — direct quotes are more valuable than summaries. Every field must have a detailed value, an [ASSUMPTION: reasoning] label with your intelligent inference, or a GAP marker as a last resort. Lean heavily toward assumptions over gaps. There is NO word limit — be as thorough as the transcript allows.`,

  'research-bible': `You are building a comprehensive Research Bible for ClubSheIs, a digital marketing and content production agency in South Africa.

The Research Bible is the research foundation that sits behind the Creative Brief — it tells the team who we're really talking to, what they believe, what they've tried, and exactly what kind of messaging will cut through for this specific client at this specific moment in time.

It uses Eugene Schwartz's Breakthrough Advertising frameworks to analyse the market and translate that analysis into concrete messaging direction.

YOUR JOB: Use your AI intelligence to deeply analyse everything in the transcript and client profile. Don't just extract — THINK. Connect dots. Identify patterns. Make strategic inferences. Every section should feel like a senior strategist wrote it after weeks of research, not like a form was filled in.

RULES:
- Use [ASSUMPTION: reasoning] liberally — intelligent assumptions based on the industry, niche, audience, and what the client said are EXPECTED and VALUABLE. The creative team needs a rich, complete picture.
- Only use GAP: for things that truly cannot be inferred (e.g. specific pricing not mentioned, exact testimonial quotes).
- Never fabricate specific statistics, competitor names you can't infer, or client quotes. But DO write detailed strategic analysis based on what you know about their market.
- Every section should be multiple paragraphs with deep analysis. Not bullet points with one-line answers.

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
Write a FULL portrait — minimum 2 paragraphs. Not demographics. Paint the real person. What does her morning look like? What keeps her up at night? What does she scroll past? What makes her stop? What does she secretly want but won't say out loud? Use the client profile's audience section as a starting point but go DEEPER using your knowledge of this niche and market.

Quick-reference profile:
- Age range:
- Life stage:
- Location:
- Income level: [ASSUMPTION based on niche]
- Platforms they're on:
- How they consume content:
- What they trust:
- What makes them click:
- What makes them BUY:
- Decision-making style: [Impulsive? Research-heavy? Need social proof? Need a personal connection first?]

#### Core Pain Point
Don't just name it — UNPACK it. Write 2-3 paragraphs exploring the layers of this pain. The surface complaint leads to a deeper frustration which leads to a core fear. Map all three layers. Write it the way they'd say it to a friend at 11pm.

- **Underlying fear:** [the thing they're actually scared of — be specific and emotional]
- **Surface complaint:** [what they'd type into Google — exact search queries]
- **The gap they feel:** [the distance between where they are and where they feel they should be — make this visceral]
- **The trigger moment:** [What specific event or realisation makes them finally seek help? ASSUMPTION is fine]
- **What they've told themselves:** [The story they tell themselves about why they're stuck]

#### Common But Disliked Solutions
Write a detailed analysis — minimum 3-4 failed solutions with full context. For each one:
- What is it? (the solution they tried)
- Why did it seem like a good idea?
- Why did it fail or disappoint?
- What's the emotional residue? (frustration, distrust, cynicism)
- How does this affect their willingness to try again?

This section directly informs our messaging — we need to acknowledge what they've been through without dismissing their past choices.

#### Unique Solution
Don't just state the difference — EXPLAIN it. Write 2-3 paragraphs about why this brand's approach is fundamentally different. What's the mechanism? What's the philosophy? Why does it work when other things haven't?

- **The core difference:** [one powerful sentence]
- **Why it works when others don't:** [the mechanism — explain it like you're explaining to a friend]
- **What makes it feel safe to try:** [risk reversal, social proof, familiarity, community]
- **The transformation journey:** [What changes first? What changes last? What does the in-between feel like?]

#### How The Solution Works
Detailed step-by-step. Number each step. For each step explain:
- What happens
- How long it takes
- What the client experiences
- What the outcome of this step is

Make this concrete enough that someone reading it would understand exactly what they're signing up for.

#### Credibility / Evidence
Use [ASSUMPTION] where needed — but be thorough. Think about:
- Track record: [years in business, client numbers, results — with sources or ASSUMPTION]
- Proof points: [media appearances, speaking, awards, certifications — confirmed or ASSUMPTION]
- Social proof signals: [engagement quality, comment sentiment, follower growth trajectory]
- Industry recognition: [What positions them as credible in this space?]
- Personal story: [Does their own journey serve as proof? Many SA entrepreneurs use their personal transformation as credibility]

#### Testimonials
If the client provided testimonials in the transcript, paste them verbatim.

If no testimonials are available, write: GAP: No testimonials provided. Request from client before content production begins.

Then add: [ASSUMPTION: Based on the type of transformation this brand offers, ideal testimonials would focus on: (list 3-4 specific outcomes/feelings that would make compelling social proof)]

#### Desired Feelings After Success
Write a full paragraph — not a list. Describe the emotional state in rich detail. What does the ideal client feel when this brand has done its job? Confidence? Relief? Pride? Belonging? Write it like a scene — where are they, what are they doing, how do they feel differently?

#### Specific Outcomes Hoped For
List 5-7 concrete outcomes with context. Not generic — specific to this niche and this audience. For each outcome, briefly explain why it matters to THIS person (not just anyone).

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
- [Specific signal — e.g. comment behaviour, search patterns, how they talk about the problem]
- [Specific signal from transcript]
- [Specific signal from niche knowledge — ASSUMPTION if needed]
- [Specific signal]

**What this means for messaging:**
[Write 2-3 paragraphs. This is the most important strategic section. What kind of message lands at this stage? What do you lead with? What do you avoid? What hook structures work? What emotions do you trigger first? What proof format do they need? Be specific enough that a copywriter could write the first draft from this section alone.]

**Recommended entry point for content:**
[Concrete recommendation with examples — hook style, format, angle to lead with. Give 2-3 specific hook examples that would work for this client at this awareness stage.]

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
- [What claims are common in this space — use ASSUMPTION based on niche knowledge]
- [What the audience is tired of seeing]
- [What IS cutting through — and why]
- [What competitors are doing that's working or failing]

**What this means for messaging:**
[Write 2-3 paragraphs. At this sophistication level, what kind of message cuts through? If Level 3+, what's the NAMED MECHANISM this brand should lead with? What needs to be named, shown, or proven differently from everyone else? Give concrete direction a content creator can act on immediately.]

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

Use your AI knowledge of this industry/niche to identify likely competitors even if the client didn't name them. Label inferred competitors with [ASSUMPTION].

| Competitor | Positioning | Strengths | Weaknesses | Gap we can own |
|---|---|---|---|---|
| [Name 1] | [How they position] | [What's working] | [Where they fall short] | [Opportunity] |
| [Name 2] | [How they position] | [What's working] | [Where they fall short] | [Opportunity] |
| [Name 3] | [How they position] | [What's working] | [Where they fall short] | [Opportunity] |

**What competitors are saying that's working:**
[Paragraph analysing the common messaging themes in this space]

**What competitors are saying that's NOT working:**
[Paragraph about what's falling flat and why]

**The whitespace:**
[2-3 paragraphs. What nobody in this market is saying or doing that this brand could own. The positioning gap. Don't just name it — explain why it's available, why it matters to the audience, and how to claim it. This is the strategic gold.]

## PART 6 — CONTENT INTELLIGENCE

What's actually working in this market right now. Use your knowledge of the niche, the SA market, and social media trends to provide deep, actionable intelligence. Use [ASSUMPTION] labels where inferring from niche expertise.

**Formats with highest engagement in this niche:**
- [Format 1 — and what specifically makes it work, with example of what it looks like]
- [Format 2]
- [Format 3]

**Topics that consistently drive saves, shares, and DMs:**
- [Topic 1 — with explanation of why this resonates with this specific audience]
- [Topic 2]
- [Topic 3]
- [Topic 4]

**Topics that get likes but no action:**
- [Topic — and the psychological reason why it entertains but doesn't convert]

**Caption patterns that convert:**
- [Pattern 1 — with a concrete example of what the first 2 lines look like]
- [Pattern 2 — with example]
- [Pattern 3 — with example]

**Hook formulas for this niche:**
- [Hook 1 — write an actual example hook this client could use]
- [Hook 2]
- [Hook 3]
- [Hook 4]
- [Hook 5]

**Audience language to use in hooks and copy:**
- [List 10+ exact phrases, words, and expressions this audience uses about their problems, desires, and frustrations — pulled from transcript AND inferred from niche knowledge]

**Content themes to avoid:**
- [Theme — and why it won't work for this brand/audience]

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

Write in plain, human language. Short paragraphs. No hype words. Be deeply strategic and actionable — this document drives ALL content creation for this client. Think like a senior strategist who has spent weeks researching this market.

Every section must be THOROUGH — multiple paragraphs, not single lines. Use [ASSUMPTION] liberally based on your knowledge of the industry, the SA market, social media dynamics, and audience psychology. Only use GAP for things genuinely unknowable.

Part 4 (Breakthrough Advertising) is the most important section for the creative team — give it maximum depth. If the market is at Sophistication Level 3 or above, the team must lead with a named mechanism — identify and name it.

Part 6 (Content Intelligence) is the most actionable section — give real hook examples, real caption patterns, real audience language.

There is NO word limit. Be as comprehensive as possible. The more detail, the better the creative brief and content will be.`,

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

    const transcriptLimit = documentType === 'brand-voice' ? 10000 : 20000
    let userMessage = `CLIENT: ${clientName} (${brandName || 'No brand name'})\n\nSTRATEGY SESSION TRANSCRIPT:\n${(transcript || '').slice(0, transcriptLimit)}`

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
        max_tokens: documentType === 'brand-voice' ? 4000 : 8192,
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
