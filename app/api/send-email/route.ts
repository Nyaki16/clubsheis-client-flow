import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error - nodemailer types are dev-only
import nodemailer from 'nodemailer'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, attachAboutUs, trackingId } = await req.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 })
    }

    const gmailUser = process.env.GMAIL_USER || 'info@clubsheis.com'
    const gmailPass = process.env.GMAIL_APP_PASSWORD

    if (!gmailPass) {
      return NextResponse.json(
        { error: 'Gmail App Password not configured. Add GMAIL_APP_PASSWORD to your environment variables.' },
        { status: 500 }
      )
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    })

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

    // Build email options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mailOptions: any = {
      from: `"Nyaki & Kopano — ClubSheIs" <${gmailUser}>`,
      to,
      subject,
      text: body,
      html: htmlBody,
    }

    // Attach About Us PDF if requested
    if (attachAboutUs) {
      try {
        const pdfPath = join(process.cwd(), 'public', 'ClubSheIs-About-Us.pdf')
        const pdfBuffer = readFileSync(pdfPath)
        mailOptions.attachments = [
          {
            filename: 'ClubSheIs-About-Us.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      } catch {
        console.warn('About Us PDF not found, sending without attachment')
      }
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true, message: `Email sent to ${to}` })
  } catch (error) {
    console.error('Email send error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to send email: ${message}` }, { status: 500 })
  }
}
