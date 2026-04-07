import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Fetch a page URL and return its text content (stripped of HTML tags)
export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json() as { urls: { label: string; url: string }[] }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return Response.json({ error: 'No URLs provided' }, { status: 400 })
    }

    // Limit to 15 URLs max
    const toFetch = urls.slice(0, 15)

    const results = await Promise.allSettled(
      toFetch.map(async ({ label, url }) => {
        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'ClubSheIs-QA-Bot/1.0',
              'Accept': 'text/html,application/xhtml+xml',
            },
            signal: AbortSignal.timeout(10000),
          })

          if (!res.ok) {
            return { label, url, status: 'error' as const, content: `HTTP ${res.status}` }
          }

          const html = await res.text()

          // Strip HTML to get text content
          let text = html
            // Remove script and style blocks
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
            // Remove HTML tags
            .replace(/<[^>]+>/g, ' ')
            // Decode common HTML entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&rsquo;/g, "'")
            .replace(/&lsquo;/g, "'")
            .replace(/&rdquo;/g, '"')
            .replace(/&ldquo;/g, '"')
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–')
            .replace(/&#\d+;/g, '')
            // Collapse whitespace
            .replace(/\s+/g, ' ')
            .trim()

          // Truncate to ~4000 chars per page to stay within token limits
          if (text.length > 4000) {
            text = text.slice(0, 4000) + '... [truncated]'
          }

          return { label, url, status: 'ok' as const, content: text }
        } catch (e) {
          return { label, url, status: 'error' as const, content: e instanceof Error ? e.message : 'Failed to fetch' }
        }
      })
    )

    const pages = results.map(r => r.status === 'fulfilled' ? r.value : { label: '', url: '', status: 'error' as const, content: 'Fetch failed' })

    return Response.json({ pages })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}
