import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(req: NextRequest) {
  try {
    const { clientName, brandName, email, notes } = await req.json()

    if (!clientName) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json(
        { error: 'Google Calendar not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN to environment variables.' },
        { status: 500 }
      )
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Set the follow-up date to 2 weeks from now
    const followUpDate = new Date()
    followUpDate.setDate(followUpDate.getDate() + 14)
    followUpDate.setHours(9, 0, 0, 0) // 9 AM

    const endDate = new Date(followUpDate)
    endDate.setHours(9, 30, 0, 0) // 30-minute reminder block

    const description = [
      `Follow-up call with ${clientName}${brandName ? ` (${brandName})` : ''}`,
      email ? `Email: ${email}` : '',
      notes ? `\nNotes from discovery call:\n${notes}` : '',
      '\n---',
      'Created by ClubSheIs Client Flow System',
    ].filter(Boolean).join('\n')

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Follow Up: ${brandName || clientName}`,
        description,
        start: {
          dateTime: followUpDate.toISOString(),
          timeZone: 'Africa/Johannesburg',
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: 'Africa/Johannesburg',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'email', minutes: 60 },
          ],
        },
        colorId: '6', // Tangerine — stands out
      },
      sendUpdates: 'none',
    })

    return NextResponse.json({
      success: true,
      message: `Reminder set for ${followUpDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      eventLink: event.data.htmlLink,
      date: followUpDate.toISOString(),
    })
  } catch (error) {
    console.error('Calendar error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to create reminder: ${message}` }, { status: 500 })
  }
}
