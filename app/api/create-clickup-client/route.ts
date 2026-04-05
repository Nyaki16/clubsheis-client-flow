import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { clientName, brandName, email, phone, package: pkg } = await req.json()

    const clickupToken = process.env.CLICKUP_API_TOKEN
    const listId = process.env.CLICKUP_CLIENT_LIST_ID

    if (!clickupToken || !listId) {
      return NextResponse.json(
        { error: 'ClickUp not configured. Add CLICKUP_API_TOKEN and CLICKUP_CLIENT_LIST_ID.' },
        { status: 500 }
      )
    }

    const taskName = brandName || clientName

    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
      method: 'POST',
      headers: {
        'Authorization': clickupToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: taskName,
        description: [
          `**Client:** ${clientName}`,
          brandName ? `**Brand:** ${brandName}` : '',
          email ? `**Email:** ${email}` : '',
          phone ? `**Phone:** ${phone}` : '',
          pkg ? `**Package:** ${pkg}` : '',
          '',
          '---',
          'Created by ClubSheIs Client Flow System',
        ].filter(Boolean).join('\n'),
        status: 'active',
        priority: 2, // High
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `ClickUp API error: ${err}` }, { status: res.status })
    }

    const task = await res.json()

    return NextResponse.json({
      success: true,
      taskId: task.id,
      taskUrl: task.url,
      message: `Created ClickUp task "${taskName}"`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
