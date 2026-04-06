import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL
    if (!scriptUrl) {
      return Response.json({ error: 'GOOGLE_APPS_SCRIPT_URL not set' }, { status: 500 })
    }

    const { title, content, folderId } = await req.json()

    if (!title || !content) {
      return Response.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const payload = JSON.stringify({ title, content, folderId: folderId || '' })

    // Google Apps Script redirects POST requests (302).
    // Edge runtime strips the body on redirect, so we must follow manually.
    let res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      redirect: 'manual',
    })

    // Follow redirect(s) manually, re-sending the POST body each time
    let redirectCount = 0
    while ((res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308) && redirectCount < 5) {
      const location = res.headers.get('location')
      if (!location) break
      res = await fetch(location, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        redirect: 'manual',
      })
      redirectCount++
    }

    if (!res.ok) {
      const errText = await res.text()
      return Response.json({ error: `Apps Script error (${res.status}): ${errText}` }, { status: res.status })
    }

    const text = await res.text()
    try {
      const data = JSON.parse(text)
      return Response.json(data)
    } catch {
      // Sometimes Apps Script wraps response — try to extract JSON
      return Response.json({ error: `Unexpected response: ${text.slice(0, 200)}` }, { status: 500 })
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
