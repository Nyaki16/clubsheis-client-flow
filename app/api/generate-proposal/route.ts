import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { clientName, brandName, needs, budgetRange } = await req.json()

    const brand = brandName || clientName
    const today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

    // Recommend package based on budget and needs
    const needsLower = (needs || '').toLowerCase()
    let recommendedPackage = ''
    let packageDetails = ''
    let pricing = ''

    if (needsLower.includes('funnel') || needsLower.includes('course') || needsLower.includes('full') || needsLower.includes('lead magnet') || budgetRange === 'R30,000+') {
      recommendedPackage = 'Full Build'
      packageDetails = 'A complete 3-step funnel — Lead Magnet page, One-Time Offer (OTO), and Main Product page (course, coaching program, or membership). Everything connected inside Ghutte with automations, email sequences, and payment integration.'
      pricing = 'From R32,500 (once-off build)'
    } else if (needsLower.includes('content') || needsLower.includes('video') || needsLower.includes('studio') || needsLower.includes('shoot')) {
      recommendedPackage = 'Content Day'
      packageDetails = 'A full production day in studio — long-form and short-form videos with complete pre-production planning (creative brief, content plan, scripts, shot list). Edited deliverables included.'
      pricing = 'From R8,500 per Content Day'
    } else if (needsLower.includes('ads') || needsLower.includes('email') || needsLower.includes('social') || needsLower.includes('marketing') || needsLower.includes('meta')) {
      recommendedPackage = 'Ads + Email + Social'
      packageDetails = 'Monthly management of your digital marketing — META ad campaigns, email newsletters, and social media content. You can choose any combination based on what you need most.'
      pricing = 'From R12,500/month'
    } else if (needsLower.includes('page') || needsLower.includes('landing') || needsLower.includes('website') || needsLower.includes('sales page')) {
      recommendedPackage = 'New Page Build'
      packageDetails = 'A single, high-converting page (landing page, sales page, or opt-in page) designed and built inside Ghutte with mobile optimisation and analytics tracking.'
      pricing = 'From R5,000 (once-off)'
    } else if (needsLower.includes('ghutte') || needsLower.includes('platform') || needsLower.includes('onboard')) {
      recommendedPackage = 'Ghutte Only'
      packageDetails = 'Full onboarding onto the Ghutte platform — setup, training, and a monthly strategy session to keep you on track.'
      pricing = 'R3,800/month'
    } else {
      recommendedPackage = 'Custom Package'
      packageDetails = 'Based on our conversation, we\'ll put together a tailored scope that matches exactly what you need — no more, no less.'
      pricing = 'We\'ll confirm pricing based on the final scope'
    }

    const proposal = `# Proposal for ${brand}

**Date:** ${today}
**Prepared by:** Nyaki & Kopano — ClubSheIs

---

## Hi ${clientName},

Thank you for taking the time to chat with us. We loved learning about ${brand} and what you're building. It's clear you're serious about taking things to the next level, and we're excited about the possibility of working together.

## What We Heard

${needs ? `Based on our conversation, here's what we understand you need:\n\n${needs}` : `We discussed your goals and what you're looking to achieve. We'll refine this section based on our discovery call notes.`}

${budgetRange ? `**Budget range:** ${budgetRange}` : ''}

## What We Recommend

**${recommendedPackage}**

${packageDetails}

## What You'll Get

- Discovery & strategy session to align on goals
- Full project scoping and timeline
- ${recommendedPackage === 'Content Day' ? 'Pre-production pipeline: creative brief, content plan, scripts, shot list' : 'Design and build with revisions included'}
- ${recommendedPackage.includes('Ads') ? 'Monthly reporting and optimisation' : 'Final delivery with all assets and access'}
- Dedicated support from the ClubSheIs team throughout
- ${recommendedPackage === 'Full Build' ? 'Automations, email sequences, and payment integration' : 'Training and handover documentation'}

## Investment

**${pricing}**

- 50% deposit to secure your spot and kick off the project
- 50% on completion / before final delivery
- Payment via EFT or card (Paystack)

## Timeline

- **Week 1:** Strategy session + project kick-off
- **Week 2–3:** Build / production phase
- **Week 4:** Review, revisions, and final delivery

We can start as soon as the deposit is received.

## Next Steps

1. Review this proposal
2. Let us know if you'd like to adjust anything
3. Once you're happy, we'll send the invoice and get started

We're genuinely excited about working with ${brand}. Let's make it happen.`

    return Response.json({ proposal })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: `Failed to generate proposal: ${msg}` }, { status: 500 })
  }
}
