import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GHL sends a webhook when an appointment is booked/updated
// Set this URL in your GHL workflow: https://clubsheis-client-flow.vercel.app/api/webhook/ghl-booking
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()

    // GHL appointment webhook payload fields
    const contactEmail = payload.email || payload.contact?.email || ''
    const contactName = payload.contact_name || payload.contact?.name || payload.full_name || ''
    const appointmentDate = payload.date_time || payload.start_time || payload.selectedTimezone || ''
    const calendarName = payload.calendar_name || payload.calendarName || ''
    const status = payload.status || 'booked'

    console.log('GHL Booking Webhook:', { contactEmail, contactName, appointmentDate, calendarName, status })

    if (!contactEmail && !contactName) {
      return NextResponse.json({ received: true, message: 'No contact info — skipping' })
    }

    // Find the client by email or name
    let client = null
    if (contactEmail) {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .ilike('email', contactEmail)
        .limit(1)
      client = data?.[0]
    }
    if (!client && contactName) {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .ilike('name', `%${contactName}%`)
        .limit(1)
      client = data?.[0]
    }

    if (!client) {
      console.log('No matching client found for:', contactEmail || contactName)
      return NextResponse.json({ received: true, message: 'No matching client found' })
    }

    // Parse the appointment date
    let dateStr = ''
    if (appointmentDate) {
      try {
        const d = new Date(appointmentDate)
        dateStr = d.toISOString().split('T')[0] // YYYY-MM-DD
      } catch {
        dateStr = appointmentDate
      }
    }

    // Save the strategy session date and booking status
    if (dateStr) {
      await supabase.from('stage_data').upsert({
        client_id: client.id,
        stage_key: 'onboarding',
        field_key: 'strategy_session_date',
        field_value: dateStr,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id,stage_key,field_key' })
    }

    const bookingStatus = status === 'cancelled' ? 'Rescheduled' : 'Booked'
    await supabase.from('stage_data').upsert({
      client_id: client.id,
      stage_key: 'onboarding',
      field_key: 'booking_status',
      field_value: bookingStatus,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id,stage_key,field_key' })

    console.log(`Updated client ${client.name}: session date=${dateStr}, status=${bookingStatus}`)

    return NextResponse.json({
      received: true,
      clientId: client.id,
      clientName: client.name,
      sessionDate: dateStr,
      bookingStatus,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ received: true, error: 'Processing failed' }, { status: 200 })
  }
}

// GHL may send GET to verify the webhook URL
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'ghl-booking-webhook' })
}
