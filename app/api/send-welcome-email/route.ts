import { NextRequest, NextResponse } from 'next/server'

const GHL_API = 'https://services.leadconnectorhq.com'
const GHL_PIT_KEY = 'pit-572b13e1-ccf9-4ea5-8746-01545c7a704a'
const GHL_LOCATION_ID = 'AkhI3DXZ01YFKLGXfg2V'
const WORKFLOW_ID = '8ea9681a-5d32-43f9-8306-b1bdceae077e'

async function ghlFetch(path: string, method: string, body?: Record<string, unknown>) {
  const res = await fetch(`${GHL_API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GHL_PIT_KEY}`,
      'Version': '2021-07-28',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res
}

export async function POST(req: NextRequest) {
  try {
    const { clientName, clientEmail, clientPhone, brandName, packageName } = await req.json()

    if (!clientEmail) {
      return NextResponse.json({ error: 'Client email is required' }, { status: 400 })
    }

    // Split name into first/last
    const nameParts = (clientName || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Step 1: Search for existing contact by email
    const searchRes = await ghlFetch(
      `/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(clientEmail)}&limit=1`,
      'GET'
    )
    const searchData = await searchRes.json()
    let contactId = searchData?.contacts?.[0]?.id

    if (contactId) {
      // Step 2a: Update existing contact with tags
      await ghlFetch(`/contacts/${contactId}`, 'PUT', {
        firstName,
        lastName,
        phone: clientPhone || undefined,
        tags: ['client-onboarding', packageName || 'client'],
        customFields: [
          { key: 'company', field_value: brandName || '' },
        ],
      })
    } else {
      // Step 2b: Create new contact
      const createRes = await ghlFetch('/contacts/', 'POST', {
        locationId: GHL_LOCATION_ID,
        firstName,
        lastName,
        email: clientEmail,
        phone: clientPhone || undefined,
        tags: ['client-onboarding', packageName || 'client'],
        source: 'ClubSheIs Client Flow',
        customFields: [
          { key: 'company', field_value: brandName || '' },
        ],
      })

      if (!createRes.ok) {
        const errText = await createRes.text()
        return NextResponse.json({ error: `Failed to create GHL contact: ${errText}` }, { status: createRes.status })
      }

      const createData = await createRes.json()
      contactId = createData?.contact?.id
    }

    if (!contactId) {
      return NextResponse.json({ error: 'Could not find or create contact in GHL' }, { status: 500 })
    }

    // Step 3: Trigger the workflow
    const workflowRes = await ghlFetch(
      `/contacts/${contactId}/workflow/${WORKFLOW_ID}`,
      'POST'
    )

    if (!workflowRes.ok) {
      const errText = await workflowRes.text()
      console.error('GHL workflow trigger failed:', errText)
      // Don't fail the whole request — contact was created/updated
      return NextResponse.json({
        success: true,
        contactId,
        warning: `Contact created but workflow trigger failed: ${errText}`,
        message: 'Contact added to GHL. Workflow may need to be triggered manually.',
      })
    }

    return NextResponse.json({
      success: true,
      contactId,
      message: `Contact added to GHL and welcome workflow triggered for ${clientName}`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
