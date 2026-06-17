import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTrackerAdminClient } from '@/lib/tracker'

const CLIENT_COLORS = [
  '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#F43F5E', '#14B8A6',
]

export async function POST(req: NextRequest) {
  try {
    const { clientName, brandName, clientFlowClientId } = (await req.json()) as {
      clientName?: string
      brandName?: string
      clientFlowClientId?: string
    }

    const name = (brandName || clientName || '').trim()
    if (!name) {
      return NextResponse.json({ error: 'clientName or brandName is required' }, { status: 400 })
    }

    const tracker = createTrackerAdminClient()

    // Pick a color based on existing client count (matches tracker's own logic).
    const { count } = await tracker
      .from('clients')
      .select('id', { count: 'exact', head: true })
    const color = CLIENT_COLORS[(count ?? 0) % CLIENT_COLORS.length]

    // Reuse an existing tracker client with the same name if one exists,
    // otherwise create a new row.
    const { data: existing } = await tracker
      .from('clients')
      .select('id, name')
      .eq('name', name)
      .limit(1)
      .maybeSingle()

    let trackerClientId: string
    let reused = false
    if (existing?.id) {
      trackerClientId = existing.id
      reused = true
    } else {
      const { data, error } = await tracker
        .from('clients')
        .insert({ name, color })
        .select('id')
        .single()
      if (error || !data) {
        return NextResponse.json(
          { error: `Failed to create tracker client: ${error?.message ?? 'unknown error'}` },
          { status: 500 }
        )
      }
      trackerClientId = data.id
    }

    // Persist the tracker_client_id on the client-flow stage_data so the
    // Production stage can pick it up later without extra state plumbing.
    if (clientFlowClientId) {
      const cfUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const cfKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (cfUrl && cfKey) {
        const cf = createClient(cfUrl, cfKey)
        await cf.from('flow_stage_data').upsert(
          {
            client_id: clientFlowClientId,
            stage_key: 'production',
            field_key: 'tracker_client_id',
            field_value: trackerClientId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'client_id,stage_key,field_key' }
        )
      }
    }

    const trackerUrl = process.env.TRACKER_APP_URL || 'https://clubsheis-tracker.vercel.app'

    return NextResponse.json({
      success: true,
      trackerClientId,
      reused,
      trackerUrl: `${trackerUrl}/clients/${trackerClientId}`,
      message: reused
        ? `Linked existing tracker client "${name}"`
        : `Created tracker client "${name}"`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
