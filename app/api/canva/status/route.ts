import { getStoredTokens } from '@/lib/canva'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const tokens = await getStoredTokens()
    if (!tokens) return Response.json({ connected: false })
    const expiresAt = new Date(tokens.expires_at).getTime()
    const expiresInMin = Math.round((expiresAt - Date.now()) / 60000)
    return Response.json({
      connected: true,
      scope: tokens.scope,
      expiresInMin,
      // Even an expired token is "connected" — we'll refresh on first call.
      tokenExpired: expiresInMin <= 0,
    })
  } catch (err) {
    return Response.json({ connected: false, error: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
