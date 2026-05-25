import { NextRequest, NextResponse } from 'next/server'
import { buildAuthorizeUrl, generatePkce } from '@/lib/canva'

export const runtime = 'nodejs'

function getRedirectUri(req: NextRequest): string {
  const explicit = process.env.CANVA_REDIRECT_URI
  if (explicit) return explicit
  const origin = req.nextUrl.origin
  return `${origin}/api/canva/auth/callback`
}

export async function GET(req: NextRequest) {
  try {
    if (!process.env.CANVA_CLIENT_ID) {
      return new Response('CANVA_CLIENT_ID not set. See CANVA_SETUP.md.', { status: 500 })
    }
    const { verifier, challenge } = await generatePkce()
    const state = crypto.randomUUID()
    const redirectUri = getRedirectUri(req)
    const authUrl = buildAuthorizeUrl(state, challenge, redirectUri)

    const res = NextResponse.redirect(authUrl)
    // 10-minute cookies — long enough for an OAuth round trip
    const cookieOpts = { httpOnly: true, secure: req.nextUrl.protocol === 'https:', sameSite: 'lax' as const, path: '/', maxAge: 600 }
    res.cookies.set('canva_pkce_verifier', verifier, cookieOpts)
    res.cookies.set('canva_oauth_state', state, cookieOpts)
    res.cookies.set('canva_redirect_uri', redirectUri, cookieOpts)
    return res
  } catch (err) {
    return new Response(`Canva auth start failed: ${err instanceof Error ? err.message : 'unknown'}`, { status: 500 })
  }
}
