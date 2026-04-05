import { NextRequest, NextResponse } from 'next/server'

// Since Google Workspace blocks service account keys, this just returns
// a direct link to the parent folder where the user creates the subfolder.
export async function POST(req: NextRequest) {
  try {
    const { brandName, clientName } = await req.json()
    const folderName = brandName || clientName
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '13opmLtB2CkiJQtKpxMPrtfza8C0FaJk6'

    return NextResponse.json({
      success: true,
      folderLink: `https://drive.google.com/drive/folders/${parentFolderId}`,
      message: `Open Client Profiles folder and create "${folderName}" with subfolders: Briefs, Content Plans, Scripts, Assets, Deliverables, Reports`,
      folderName,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
