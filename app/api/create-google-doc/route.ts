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

    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, folderId: folderId || '' }),
      redirect: 'follow',
    })

    if (!res.ok) {
      const errText = await res.text()
      return Response.json({ error: `Apps Script error: ${errText}` }, { status: res.status })
    }

    const data = await res.json()
    return Response.json(data)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
