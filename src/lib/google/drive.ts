import { google } from 'googleapis'

function getAuth() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return oauth2
}

export async function fetchDriveFileText(fileId: string): Promise<string> {
  const auth  = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  // Try Google Docs text export first (Meet transcripts are stored as Google Docs)
  try {
    const res = await drive.files.export(
      { fileId, mimeType: 'text/plain' },
      { responseType: 'text' },
    )
    return String(res.data)
  } catch {
    // Fall back to direct media download for non-Doc files
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' },
    )
    return String(res.data)
  }
}

// Extract a Drive file ID from a URL like:
// https://drive.google.com/file/d/FILE_ID/view
// https://docs.google.com/document/d/FILE_ID/edit
export function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/)
  return match?.[1] ?? null
}
