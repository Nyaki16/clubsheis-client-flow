import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    const { clientName, clientEmail, brandName, packageName, bookingLink } = await req.json()

    if (!clientEmail) {
      return NextResponse.json({ error: 'Client email is required' }, { status: 400 })
    }

    const emailBody = `Hi ${clientName},

Welcome to ClubSheIs! We're so excited to officially be working with ${brandName || 'you'}.

Here's what happens next:

1. STRATEGY SESSION — This is our deep dive into your business, audience, voice, and goals. Everything we create for you will be built from this conversation.

Book your strategy session here: ${bookingLink || '[Booking link will be shared]'}

2. BEFORE THE SESSION — Please share any brand assets you have:
   - Logo files (PNG, SVG, or AI)
   - Brand colours and fonts (if you have a style guide)
   - Any existing content you love (posts, videos, copy)
   - Logins for social platforms and website (we'll store these securely)
   - Any previous marketing materials

3. WHAT TO EXPECT — After the strategy session, we'll build your Client Profile and Research Bible. These documents become the foundation for all your content, copy, and campaigns. Nothing gets created without this step — it's how we make sure everything sounds like you.

4. TIMELINE — We aim to have the strategy session within the first week. From there, production begins based on your ${packageName || 'package'}.

If you have any questions before the session, just reply to this email. We're here.

Looking forward to building something great together.

Warm regards,
Nyaki & Kopano
ClubSheIs`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'ClubSheIs <onboarding@resend.dev>',
        to: [clientEmail],
        subject: `Welcome to ClubSheIs, ${clientName}! Let's get started`,
        text: emailBody,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Email failed: ${errText}` }, { status: res.status })
    }

    return NextResponse.json({ success: true, message: 'Welcome email sent' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
