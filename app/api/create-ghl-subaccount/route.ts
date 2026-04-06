import { NextRequest, NextResponse } from 'next/server'

const GHL_API = 'https://services.leadconnectorhq.com'
const GHL_AGENCY_KEY = 'pit-0b4566e5-54ad-4365-b5bf-72e767a92a2f'
const GHL_COMPANY_ID = 'SGOwJa0dWkFiHgpbwzY0'

export async function POST(req: NextRequest) {
  try {
    const { clientName, clientEmail, clientPhone, brandName, website } = await req.json()

    if (!clientName) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
    }

    // Use brand name for the location name, fallback to client name
    const locationName = brandName || clientName

    const res = await fetch(`${GHL_API}/locations/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GHL_AGENCY_KEY}`,
        'Version': '2021-07-28',
      },
      body: JSON.stringify({
        companyId: GHL_COMPANY_ID,
        name: locationName,
        email: clientEmail || 'info@clubsheis.com',
        phone: clientPhone || '',
        website: website || '',
        address: '',
        city: 'Johannesburg',
        state: 'Gauteng',
        country: 'ZA',
        postalCode: '2000',
        timezone: 'Africa/Johannesburg',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `GHL error: ${errText}` }, { status: res.status })
    }

    const data = await res.json()
    const locationId = data.id

    return NextResponse.json({
      success: true,
      locationId,
      locationName,
      ghlUrl: `https://app.gohighlevel.com/location/${locationId}/dashboard`,
      message: `Sub-account "${locationName}" created successfully`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
