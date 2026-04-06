import { NextRequest } from 'next/server'

export const runtime = 'edge'

const PROMPTS: Record<string, string> = {
  'client-profile': `You are building a Client Profile for ClubSheIs, a digital marketing and content production agency in South Africa.

From the strategy session transcript below, extract and organise:

## Business Overview
- What does the business do?
- Who do they serve?
- What makes them different?
- Current stage (startup, growing, established)

## Target Audience
- Primary audience demographics
- Psychographics (values, fears, desires)
- Where they hang out online
- What content they consume

## Current Marketing
- What platforms are they on?
- What's working / not working?
- Current content frequency
- Existing assets (website, email list, socials)

## Offers & Products
- Main offer(s)
- Pricing (if mentioned)
- Sales process
- Future offers planned

## Goals & Priorities
- Short-term goals (next 3 months)
- Long-term vision
- Specific KPIs or targets mentioned
- What success looks like to them

## Key Quotes
- Pull 3-5 direct quotes from the transcript that capture their voice, passion, or pain points.

Write in clear, structured sections. Be specific — use their actual words where possible. Keep it under 800 words.`,

  'research-bible': `You are building a Research Bible for ClubSheIs, a digital marketing and content production agency in South Africa.

Using the strategy session transcript AND the approved Client Profile below, create a deep research document:

## Audience Deep Dive
- Detailed avatar: name, age, job, daily life, struggles
- What keeps them up at night?
- What transformation do they want?
- Their current awareness level (Unaware → Problem Aware → Solution Aware → Product Aware → Most Aware)

## Market Sophistication
- How sophisticated is the market? (Level 1-5, Eugene Schwartz framework)
- What claims have been overused?
- What angle is still fresh?

## Messaging Strategy
- Core message / big idea
- Primary hook angles (3-5)
- Objections to address
- Social proof opportunities
- Emotional triggers to use
- Logical arguments that support

## Content Pillars
- 3-5 content pillars that align with the brand's expertise and audience needs
- Types of content per pillar (educational, behind-the-scenes, testimonial, etc.)

## Competitor Landscape
- Key competitors mentioned or implied
- What they do well vs poorly
- Differentiation opportunities

## Recommended Tone
- How should content feel? (Bold? Nurturing? Expert? Relatable?)
- Words to use / words to avoid
- Reference examples if applicable

Be strategic and actionable. This document drives all content creation. Keep it under 1000 words.`,

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

    let userMessage = `CLIENT: ${clientName} (${brandName || 'No brand name'})\n\nSTRATEGY SESSION TRANSCRIPT:\n${(transcript || '').slice(0, 6000)}`

    if (documentType === 'research-bible' && clientProfile) {
      userMessage += `\n\nAPPROVED CLIENT PROFILE:\n${clientProfile.slice(0, 3000)}`
    }
    if (documentType === 'brand-voice') {
      if (clientProfile) userMessage += `\n\nAPPROVED CLIENT PROFILE:\n${clientProfile.slice(0, 2000)}`
      if (researchBible) userMessage += `\n\nAPPROVED RESEARCH BIBLE:\n${researchBible.slice(0, 3000)}`
    }

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
        messages: [{ role: 'user', content: `${systemPrompt}\n\n---\n\n${userMessage}` }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return Response.json({ error: `API error: ${errText}` }, { status: res.status })
    }

    const data = await res.json()
    const content = data.content?.[0]?.text || ''

    return Response.json({ document: content })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
