import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { clientName, brandName } = await req.json()
    const folderName = brandName || clientName

    const accessToken = process.env.GOOGLE_ACCESS_TOKEN
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID

    if (!accessToken || !parentFolderId) {
      return NextResponse.json(
        { error: 'Google Drive not configured. Add GOOGLE_ACCESS_TOKEN and GOOGLE_DRIVE_PARENT_FOLDER_ID.' },
        { status: 500 }
      )
    }

    // Create the main client folder
    const folderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      }),
    })

    if (!folderRes.ok) {
      const err = await folderRes.text()
      return NextResponse.json({ error: `Drive API error: ${err}` }, { status: folderRes.status })
    }

    const folder = await folderRes.json()

    // Create standard subfolders
    const subfolders = ['Briefs', 'Content Plans', 'Scripts', 'Assets', 'Deliverables', 'Reports']
    for (const sub of subfolders) {
      await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sub,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [folder.id],
        }),
      })
    }

    return NextResponse.json({
      success: true,
      folderId: folder.id,
      folderLink: `https://drive.google.com/drive/folders/${folder.id}`,
      message: `Created folder "${folderName}" with ${subfolders.length} subfolders`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
