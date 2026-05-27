import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { startAutofill, waitForAutofill, buildAutofillData, getStoredTokens } from '@/lib/canva'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json() as { clientId?: string }
    if (!clientId) return Response.json({ error: 'clientId is required' }, { status: 400 })

    const tokens = await getStoredTokens()
    if (!tokens) {
      return Response.json({ error: 'Canva is not connected. Click "Connect Canva" first.', connected: false }, { status: 401 })
    }

    const templateId = process.env.CANVA_TEMPLATE_PAID_MEDIA_BRIEF
    if (!templateId) {
      return Response.json({ error: 'CANVA_TEMPLATE_PAID_MEDIA_BRIEF env var is not set on Vercel.' }, { status: 500 })
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

    // Native autofill: Canva inserts text into the Brand Template's data fields.
    // No PDF, no parsing — every space and character is preserved exactly.
    const designName = `${client.brand || client.name} — Paid Media Creative Brief`
    const data = buildAutofillData(briefRow.field_value, client.brand || client.name, client.name)

    const { jobId } = await startAutofill(templateId, data, designName)
    const result = await waitForAutofill(jobId, { maxMs: 50_000, pollMs: 2_000 })

    if (result.status !== 'success' || !result.designUrl) {
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
          message: 'Canva is still processing the autofill — poll /api/strategy-brief/canva-status?jobId=' + jobId,
        }, { status: 202 })
      }
      return Response.json({ error: `Canva autofill failed: ${result.error || 'unknown'}`, jobId }, { status: 502 })
    }

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
