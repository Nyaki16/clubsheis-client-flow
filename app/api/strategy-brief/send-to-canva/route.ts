import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { startUrlImport, waitForUrlImport, getStoredTokens } from '@/lib/canva'

export const runtime = 'nodejs'
export const maxDuration = 60

function getBaseUrl(req: NextRequest, override?: string): string {
  if (override && /^https:\/\//i.test(override)) return override.replace(/\/$/, '')
  const envBase = process.env.NEXT_PUBLIC_APP_URL
  if (envBase && /^https:\/\//i.test(envBase)) return envBase.replace(/\/$/, '')
  // Fallback to request origin — only useful in production. Localhost won't be reachable by Canva.
  return req.nextUrl.origin.replace(/\/$/, '')
}

export async function POST(req: NextRequest) {
  try {
    const { clientId, baseUrl: baseUrlOverride } = await req.json() as { clientId?: string; baseUrl?: string }
    if (!clientId) return Response.json({ error: 'clientId is required' }, { status: 400 })

    const tokens = await getStoredTokens()
    if (!tokens) {
      return Response.json({ error: 'Canva is not connected. Click "Connect Canva" first.', connected: false }, { status: 401 })
    }

    const baseUrl = getBaseUrl(req, baseUrlOverride)
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      return Response.json({
        error: 'Canva cannot import from localhost. Deploy to Vercel first (or set NEXT_PUBLIC_APP_URL to a public HTTPS URL).',
      }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: client, error: clientErr } = await supabase
      .from('flow_clients')
      .select('id, name, brand')
      .eq('id', clientId)
      .single()
    if (clientErr || !client) return Response.json({ error: 'Client not found' }, { status: 404 })

    // Verify brief content exists before sending
    const { data: briefRow } = await supabase
      .from('flow_stage_data')
      .select('field_value')
      .eq('client_id', clientId)
      .eq('stage_key', 'strategy-brief')
      .eq('field_key', 'brief_text')
      .maybeSingle()
    if (!briefRow?.field_value) {
      return Response.json({ error: 'No brief content found for this client. Generate the brief first.' }, { status: 400 })
    }

    // Canva's HTML URL import always creates a single-page design. To get a
    // multi-page presentation in Canva we hand it the server-rendered PDF
    // (one section per page) instead, with mime_type=application/pdf.
    // The cache-buster (?t=…) forces Canva to re-fetch each time, not reuse a stale PDF.
    const briefUrl = `${baseUrl}/strategy-brief/${clientId}/pdf?t=${Date.now()}`
    const designName = `${client.brand || client.name} — Paid Media Creative Brief`

    // Kick off URL import
    const { jobId } = await startUrlImport(briefUrl, designName, 'application/pdf')

    // Poll up to 50 seconds (route has 60s budget)
    const result = await waitForUrlImport(jobId, { maxMs: 50_000, pollMs: 2_000 })

    if (result.status !== 'success' || !result.designUrl) {
      // Save the job id so the frontend can poll later if it timed out
      if (result.status === 'in_progress') {
        await supabase.from('flow_stage_data').upsert({
          client_id: clientId,
          stage_key: 'strategy-brief',
          field_key: 'canva_job_id',
          field_value: jobId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id,stage_key,field_key' })
        return Response.json({
          status: 'in_progress',
          jobId,
          message: 'Canva is still processing — poll /api/strategy-brief/canva-status?jobId=' + jobId,
        }, { status: 202 })
      }
      return Response.json({ error: `Canva import failed: ${result.error || 'unknown'}`, jobId }, { status: 502 })
    }

    // Save the design URL + id
    const now = new Date().toISOString()
    await supabase.from('flow_stage_data').upsert([
      { client_id: clientId, stage_key: 'strategy-brief', field_key: 'canva_design_url', field_value: result.designUrl, updated_at: now },
      { client_id: clientId, stage_key: 'strategy-brief', field_key: 'canva_design_id', field_value: result.designId || '', updated_at: now },
      { client_id: clientId, stage_key: 'strategy-brief', field_key: 'canva_sent_at', field_value: now, updated_at: now },
    ], { onConflict: 'client_id,stage_key,field_key' })

    return Response.json({
      status: 'success',
      designUrl: result.designUrl,
      designId: result.designId,
      sentAt: now,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
