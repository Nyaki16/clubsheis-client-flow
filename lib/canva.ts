// Canva Connect API client
// Docs: https://www.canva.dev/docs/connect/
//
// Single-row token storage in flow_canva_auth (shared team Canva account).
// All requests go through canvaFetch which refreshes the token on 401.

import { createClient } from '@supabase/supabase-js'

const CANVA_API_BASE = 'https://api.canva.com/rest/v1'
const CANVA_AUTH_BASE = 'https://www.canva.com/api/oauth'
// Token endpoint lives on api.canva.com (REST API), NOT www.canva.com.
// www.canva.com/api/oauth/token returns 403 with no body. Confirmed via
// curl smoke test 2026-05-25.
const CANVA_TOKEN_URL = `${CANVA_API_BASE}/oauth/token`

// PKCE-required OAuth scopes for the strategy-brief integration.
// design:content:write — create designs from URL imports
// asset:write — upload assets if needed
// brandtemplate:meta:read — list brand kits (we already use this)
export const CANVA_SCOPES = [
  'design:content:read',
  'design:content:write',
  'design:meta:read',
  'asset:read',
  'asset:write',
  'brandtemplate:content:read',
  'brandtemplate:meta:read',
].join(' ')

type CanvaTokens = {
  access_token: string
  refresh_token: string
  expires_at: string
  scope: string
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function getStoredTokens(): Promise<CanvaTokens | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('flow_canva_auth')
    .select('access_token, refresh_token, expires_at, scope')
    .eq('id', 'default')
    .maybeSingle()
  if (error || !data) return null
  return data as CanvaTokens
}

export async function saveTokens(payload: {
  access_token: string
  refresh_token: string
  expires_in: number
  scope?: string
}) {
  const supabase = getServiceClient()
  const expiresAt = new Date(Date.now() + payload.expires_in * 1000).toISOString()
  const { error } = await supabase
    .from('flow_canva_auth')
    .upsert({
      id: 'default',
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: expiresAt,
      scope: payload.scope || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  if (error) throw new Error(`Failed to save Canva tokens: ${error.message}`)
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.CANVA_CLIENT_ID
  const clientSecret = process.env.CANVA_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('CANVA_CLIENT_ID / CANVA_CLIENT_SECRET not set')

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Canva token refresh failed (${res.status}): ${text.slice(0, 300)}`)
  }
  const json = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
    scope?: string
  }
  await saveTokens(json)
  return json.access_token
}

export async function getValidAccessToken(): Promise<string> {
  const tokens = await getStoredTokens()
  if (!tokens) throw new Error('Canva not connected. Visit /api/canva/auth/start to connect.')

  // Refresh if expiring in next 60 seconds
  const expiresAt = new Date(tokens.expires_at).getTime()
  if (expiresAt - Date.now() > 60_000) return tokens.access_token

  return refreshAccessToken(tokens.refresh_token)
}

// Generic Canva API request with auto-refresh on 401
export async function canvaFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = await getValidAccessToken()
  const url = path.startsWith('http') ? path : `${CANVA_API_BASE}${path}`

  const doFetch = (t: string) => fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'Authorization': `Bearer ${t}`,
    },
  })

  let res = await doFetch(token)
  if (res.status === 401) {
    // Force refresh and retry once
    const tokens = await getStoredTokens()
    if (tokens) {
      token = await refreshAccessToken(tokens.refresh_token)
      res = await doFetch(token)
    }
  }
  return res
}

// OAuth helpers
export function buildAuthorizeUrl(state: string, codeChallenge: string, redirectUri: string): string {
  const clientId = process.env.CANVA_CLIENT_ID
  if (!clientId) throw new Error('CANVA_CLIENT_ID not set')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: CANVA_SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  })
  return `${CANVA_AUTH_BASE}/authorize?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string) {
  const clientId = process.env.CANVA_CLIENT_ID
  const clientSecret = process.env.CANVA_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('CANVA_CLIENT_ID / CANVA_CLIENT_SECRET not set')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  })
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Canva token exchange failed (${res.status}): ${text.slice(0, 300)}`)
  }
  return await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
    scope?: string
  }
}

// PKCE: generate a random code verifier and its S256 challenge
export async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  // 64-char URL-safe random verifier
  const bytes = new Uint8Array(48)
  crypto.getRandomValues(bytes)
  const verifier = base64UrlEncode(bytes)

  const challengeBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = base64UrlEncode(new Uint8Array(challengeBuf))
  return { verifier, challenge }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ── URL import: create a Canva design from a public HTTPS URL ──
export type UrlImportResult = {
  jobId: string
}

export async function startUrlImport(url: string, name: string, mimeType: string = 'text/html'): Promise<UrlImportResult> {
  const res = await canvaFetch('/url-imports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      title: name,
      mime_type: mimeType,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`URL import start failed (${res.status}): ${text.slice(0, 500)}`)
  }
  const json = await res.json() as { job: { id: string } }
  return { jobId: json.job.id }
}

export type UrlImportStatus = {
  status: 'in_progress' | 'success' | 'failed'
  designId?: string
  designUrl?: string
  error?: string
}

export async function getUrlImportStatus(jobId: string): Promise<UrlImportStatus> {
  const res = await canvaFetch(`/url-imports/${jobId}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`URL import status failed (${res.status}): ${text.slice(0, 500)}`)
  }
  // Canva returns result.designs (array, plural), NOT result.design — earlier
  // versions of this code looked at the singular field and treated successful
  // imports as failed because design info came back undefined.
  const json = await res.json() as {
    job: {
      id: string
      status: 'in_progress' | 'success' | 'failed'
      result?: { designs?: Array<{ id: string; urls?: { edit_url?: string; view_url?: string } }> }
      error?: { message?: string }
    }
  }
  if (json.job.status === 'success') {
    const design = json.job.result?.designs?.[0]
    return {
      status: 'success',
      designId: design?.id,
      designUrl: design?.urls?.edit_url || design?.urls?.view_url,
    }
  }
  if (json.job.status === 'failed') {
    return { status: 'failed', error: json.job.error?.message || 'unknown error' }
  }
  return { status: 'in_progress' }
}

export async function waitForUrlImport(jobId: string, opts: { maxMs?: number; pollMs?: number } = {}): Promise<UrlImportStatus> {
  const maxMs = opts.maxMs ?? 60_000
  const pollMs = opts.pollMs ?? 2_000
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const s = await getUrlImportStatus(jobId)
    if (s.status !== 'in_progress') return s
    await new Promise(r => setTimeout(r, pollMs))
  }
  return { status: 'failed', error: 'Timeout waiting for Canva import' }
}

// ── Autofill: create a Canva design from a Brand Template + data ──
// Native autofill — Canva inserts the supplied text into the template's data fields.
// This is the preferred path: no PDF parsing, no spacing issues, fully editable in Canva.

export type AutofillData = Record<string, string>
export type AutofillResult = { jobId: string }
export type AutofillStatus = {
  status: 'in_progress' | 'success' | 'failed'
  designId?: string
  designUrl?: string
  error?: string
}

export async function startAutofill(brandTemplateId: string, data: AutofillData, title?: string): Promise<AutofillResult> {
  // Canva expects each field as { type: 'text', text: '...' } in the data map.
  const payloadData: Record<string, { type: 'text'; text: string }> = {}
  for (const [k, v] of Object.entries(data)) {
    payloadData[k] = { type: 'text', text: v ?? '' }
  }
  const body: Record<string, unknown> = {
    brand_template_id: brandTemplateId,
    data: payloadData,
  }
  if (title) body.title = title

  const res = await canvaFetch('/autofills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Autofill start failed (${res.status}): ${text.slice(0, 500)}`)
  }
  const json = await res.json() as { job: { id: string } }
  return { jobId: json.job.id }
}

export async function getAutofillStatus(jobId: string): Promise<AutofillStatus> {
  const res = await canvaFetch(`/autofills/${jobId}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Autofill status failed (${res.status}): ${text.slice(0, 500)}`)
  }
  const json = await res.json() as {
    job: {
      id: string
      status: 'in_progress' | 'success' | 'failed'
      // Canva returns { result: { type: 'create_design', design: { id, urls } } }
      // for autofill jobs (singular design, unlike url-imports which uses designs[]).
      result?: { design?: { id: string; urls?: { edit_url?: string; view_url?: string } } }
      error?: { message?: string; code?: string }
    }
  }
  if (json.job.status === 'success') {
    const design = json.job.result?.design
    return {
      status: 'success',
      designId: design?.id,
      designUrl: design?.urls?.edit_url || design?.urls?.view_url,
    }
  }
  if (json.job.status === 'failed') {
    return { status: 'failed', error: json.job.error?.message || json.job.error?.code || 'unknown error' }
  }
  return { status: 'in_progress' }
}

export async function waitForAutofill(jobId: string, opts: { maxMs?: number; pollMs?: number } = {}): Promise<AutofillStatus> {
  const maxMs = opts.maxMs ?? 60_000
  const pollMs = opts.pollMs ?? 2_000
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const s = await getAutofillStatus(jobId)
    if (s.status !== 'in_progress') return s
    await new Promise(r => setTimeout(r, pollMs))
  }
  return { status: 'failed', error: 'Timeout waiting for Canva autofill' }
}

// ── Brief → autofill field mapping ──
// Parse the markdown brief into { brand_name, client_name, section_N_title, section_N_body }
// suitable for the autofill API. Section markers look like:
//   "## SECTION 1 — EXECUTIVE SUMMARY"  (em-dash, hyphen, or colon all accepted)
// Body for each section is everything between that heading and the next section heading,
// stripped of pure separator lines and trimmed.

export function buildAutofillData(
  briefText: string,
  brandName: string,
  clientName: string,
): AutofillData {
  const data: AutofillData = {
    brand_name: brandName || clientName,
    client_name: clientName,
  }

  const lines = briefText.split('\n')
  type Sec = { num: number; title: string; body: string[] }
  const sections: Sec[] = []
  let current: Sec | null = null

  const sectionRegex = /^##\s+SECTION\s+(\d+)\s*[—\-:]\s*(.+)$/i

  for (const raw of lines) {
    const line = raw.trimEnd()
    const m = line.match(sectionRegex)
    if (m) {
      if (current) sections.push(current)
      current = { num: parseInt(m[1], 10), title: m[2].trim(), body: [] }
      continue
    }
    if (!current) continue
    if (/^[-=_]{3,}$/.test(line)) continue
    current.body.push(line)
  }
  if (current) sections.push(current)

  // For each section emit:
  //   - section_N_title (the SECTION heading text)
  //   - section_N_body  (the full body of the section)
  //   - section_N_subK_title / section_N_subK_body for each "### SubHeading" block
  // The redesigned Project Strategy template uses multi-card layouts (4 cards on
  // some pages, 3 on others), each card mapping to one sub-section. Templates that
  // only need the simple title/body still get those — autofill ignores unused fields.
  const subHeadingRegex = /^###\s+(.+?)\s*$/

  for (const s of sections) {
    data[`section_${s.num}_title`] = s.title
    data[`section_${s.num}_body`] = s.body.join('\n').trim()

    type Sub = { title: string; body: string[] }
    const subs: Sub[] = []
    let curSub: Sub | null = null
    for (const line of s.body) {
      const sh = line.match(subHeadingRegex)
      if (sh) {
        if (curSub) subs.push(curSub)
        curSub = { title: sh[1].trim(), body: [] }
        continue
      }
      if (curSub) curSub.body.push(line)
    }
    if (curSub) subs.push(curSub)

    subs.forEach((sub, i) => {
      const k = i + 1
      data[`section_${s.num}_sub${k}_title`] = sub.title
      data[`section_${s.num}_sub${k}_body`] = sub.body.join('\n').trim()

      // Sub-sub level: extract `- **Title:** body` bullets as item fields. The
      // redesigned template has multi-card pages (e.g. 3 tone pillars,
      // Always/Never) that need each bullet to fill its own card.
      const itemRegex = /^\s*[-*]\s+\*\*([^*]+?):?\*\*\s*[:—-]?\s*(.*)$/
      const items: Array<{ title: string; body: string }> = []
      let curItem: { title: string; body: string[] } | null = null
      for (const line of sub.body) {
        const m = line.match(itemRegex)
        if (m) {
          if (curItem) items.push({ title: curItem.title, body: curItem.body.join('\n').trim() })
          curItem = { title: m[1].trim().replace(/[:.,]+$/, ''), body: m[2] ? [m[2]] : [] }
          continue
        }
        if (curItem && line.trim()) curItem.body.push(line.replace(/^\s+/, ''))
      }
      if (curItem) items.push({ title: curItem.title, body: curItem.body.join('\n').trim() })

      items.forEach((item, j) => {
        const m = j + 1
        data[`section_${s.num}_sub${k}_item${m}_title`] = item.title
        data[`section_${s.num}_sub${k}_item${m}_body`] = item.body
      })
    })
  }

  return data
}
