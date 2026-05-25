import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUrlImportStatus } from '@/lib/canva'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get('jobId')
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!jobId) return Response.json({ error: 'jobId is required' }, { status: 400 })

    const result = await getUrlImportStatus(jobId)
    if (result.status === 'success' && result.designUrl && clientId) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const now = new Date().toISOString()
      await supabase.from('flow_stage_data').upsert([
        { client_id: clientId, stage_key: 'strategy-brief', field_key: 'canva_design_url', field_value: result.designUrl, updated_at: now },
        { client_id: clientId, stage_key: 'strategy-brief', field_key: 'canva_design_id', field_value: result.designId || '', updated_at: now },
        { client_id: clientId, stage_key: 'strategy-brief', field_key: 'canva_sent_at', field_value: now, updated_at: now },
      ], { onConflict: 'client_id,stage_key,field_key' })
    }
    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
