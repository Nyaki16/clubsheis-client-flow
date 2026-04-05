import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { readFileSync } from 'fs'
import { join } from 'path'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, attachAboutUs, trackingId } = await req.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json(
        { error: 'Resend API key not configured. Add RESEND_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    const resend = new Resend(resendKey)

    // Determine sender — use custom domain if verified, otherwise Resend default
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'ClubSheIs <onboarding@resend.dev>'

    // Convert body to HTML
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clubsheis-client-flow.vercel.app'
    let htmlBody = body
      .split('\n')
      .map((line: string) => {
        if (line.startsWith('# ')) return `<h2 style="color:#1c1917;margin:16px 0 8px">${line.replace('# ', '')}</h2>`
        if (line.startsWith('## ')) return `<h3 style="color:#1c1917;margin:12px 0 4px">${line.replace('## ', '')}</h3>`
        if (line.startsWith('**') && line.endsWith('**')) return `<p style="font-weight:600;color:#1c1917;margin:8px 0">${line.replace(/\*\*/g, '')}</p>`
        if (line.startsWith('- ')) return `<li style="color:#44403c;margin:2px 0 2px 16px">${line.replace('- ', '')}</li>`
        if (line === '---') return '<hr style="border:none;border-top:1px solid #e7e5e4;margin:16px 0">'
        if (line.trim() === '') return '<br>'
        return `<p style="color:#44403c;margin:4px 0">${line.replace(/\*\*/g, '<strong>').replace(/\*/g, '')}</p>`
      })
      .join('\n')

    // Add tracking pixel for proposal emails
    if (trackingId) {
      htmlBody += `<img src="${appUrl}/api/track?id=${trackingId}" width="1" height="1" style="display:none" alt="" />`
    }

    // Build attachments
    const attachments: { filename: string; content: Buffer }[] = []
    if (attachAboutUs) {
      try {
        const pdfPath = join(process.cwd(), 'public', 'ClubSheIs-About-Us.pdf')
        const pdfBuffer = readFileSync(pdfPath)
        attachments.push({
          filename: 'ClubSheIs-About-Us.pdf',
          content: pdfBuffer,
        })
      } catch {
        console.warn('About Us PDF not found, sending without attachment')
      }
    }

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      text: body,
      html: htmlBody,
      ...(attachments.length > 0 ? { attachments } : {}),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Email sent to ${to}` })
  } catch (error) {
    console.error('Email send error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to send email: ${message}` }, { status: 500 })
  }
}
