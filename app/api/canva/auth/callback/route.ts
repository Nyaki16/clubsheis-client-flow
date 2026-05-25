import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, saveTokens } from '@/lib/canva'

export const runtime = 'nodejs'

function html(body: string, status = 200) {
  return new Response(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Canva Connect</title><style>body{font-family:-apple-system,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#1c1917}h1{font-size:20px;margin-bottom:8px}p{color:#57534e;line-height:1.5}a{color:#0f766e}.ok{color:#15803d;font-weight:600}.err{color:#b91c1c;font-weight:600;background:#fee2e2;padding:12px;border-radius:8px;font-family:ui-monospace,monospace;font-size:12px;white-space:pre-wrap;word-break:break-all}</style></head><body>${body}</body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return html(`<h1>Canva connection failed</h1><p class="err">${error}: ${url.searchParams.get('error_description') || ''}</p><p><a href="/api/canva/auth/start">Try again</a></p>`, 400)
  }
  if (!code || !state) {
    return html('<h1>Missing code or state</h1><p class="err">Canva did not return the required OAuth parameters.</p>', 400)
  }

  const storedState = req.cookies.get('canva_oauth_state')?.value
  const verifier = req.cookies.get('canva_pkce_verifier')?.value
  const redirectUri = req.cookies.get('canva_redirect_uri')?.value

  if (!storedState || storedState !== state) {
    return html('<h1>State mismatch</h1><p class="err">OAuth state did not match. The connection attempt may have expired — try connecting again.</p><p><a href="/api/canva/auth/start">Try again</a></p>', 400)
  }
  if (!verifier || !redirectUri) {
    return html('<h1>Session expired</h1><p class="err">PKCE verifier missing from cookies. Try connecting again.</p><p><a href="/api/canva/auth/start">Try again</a></p>', 400)
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier, redirectUri)
    await saveTokens(tokens)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return html(`<h1>Token exchange failed</h1><p class="err">${msg}</p><p><a href="/api/canva/auth/start">Try again</a></p>`, 500)
  }

  // Clear the OAuth cookies
  const res = html(`<h1 class="ok">✓ Canva connected</h1><p>The team's Canva account is now linked. You can close this tab — strategy briefs can now be pushed to Canva from the client flow.</p><p><a href="/">Return to client flow</a></p>`)
  res.headers.append('Set-Cookie', 'canva_pkce_verifier=; Path=/; Max-Age=0')
  res.headers.append('Set-Cookie', 'canva_oauth_state=; Path=/; Max-Age=0')
  res.headers.append('Set-Cookie', 'canva_redirect_uri=; Path=/; Max-Age=0')
  return res
}
