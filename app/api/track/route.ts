import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Tracking pixel — when the client opens the email, this 1x1 transparent GIF is loaded,
// which lets us update the proposal status to "Viewed"
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('id')

  if (clientId) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      )

      // Only update to "Viewed" if the current status is "Sent" (don't overwrite Accepted/Declined)
      const { data: existing } = await supabase
        .from('stage_data')
        .select('field_value')
        .eq('client_id', clientId)
        .eq('stage_key', 'proposal')
        .eq('field_key', 'proposal_status')
        .single()

      if (existing && existing.field_value === 'Sent') {
        await supabase
          .from('stage_data')
          .upsert({
            client_id: clientId,
            stage_key: 'proposal',
            field_key: 'proposal_status',
            field_value: 'Viewed',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'client_id,stage_key,field_key' })
      }

      // Also log the view timestamp
      await supabase
        .from('stage_data')
        .upsert({
          client_id: clientId,
          stage_key: 'proposal',
          field_key: 'viewed_at',
          field_value: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id,stage_key,field_key' })
    } catch (err) {
      console.error('Tracking error:', err)
    }
  }

  // Return a 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
