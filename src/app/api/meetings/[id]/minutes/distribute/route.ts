import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetings, meetingMinutes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sendEmail } from '@/lib/google/gmail'

type Params = { params: Promise<{ id: string }> }

// POST /api/meetings/[id]/minutes/distribute — send approved minutes to all attendees
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const [meeting] = await db
    .select({ title: meetings.title, attendees: meetings.attendees })
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1)

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const [existing] = await db
    .select()
    .from(meetingMinutes)
    .where(eq(meetingMinutes.meetingId, id))
    .limit(1)

  if (!existing) return NextResponse.json({ error: 'Minutes not found' }, { status: 404 })
  if (existing.status !== 'approved') {
    return NextResponse.json({ error: 'Minutes must be approved before distributing' }, { status: 422 })
  }

  const attendees = (meeting.attendees ?? []) as { name: string; email: string }[]
  const toEmails = attendees.map(a => a.email).filter(Boolean)

  if (toEmails.length > 0) {
    const htmlContent = markdownToHtml(existing.content)
    await sendEmail({
      to:      toEmails,
      subject: `Meeting Minutes: ${meeting.title}`,
      html:    htmlContent,
    })
  }

  const [minutes] = await db
    .update(meetingMinutes)
    .set({ status: 'distributed', distributedAt: new Date(), updatedAt: new Date() })
    .where(eq(meetingMinutes.id, existing.id))
    .returning()

  return NextResponse.json({ minutes, sentTo: toEmails.length })
}

// Minimal markdown → HTML for email distribution
function markdownToHtml(md: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 22px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
  h2 { font-size: 16px; margin-top: 24px; color: #555; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 14px; }
  th { background: #f5f5f5; font-weight: 600; }
  ul, ol { padding-left: 20px; }
  li { margin: 4px 0; font-size: 14px; }
  p { font-size: 14px; line-height: 1.6; }
  strong { font-weight: 600; }
</style></head>
<body>
${md
  .replace(/^# (.+)$/gm, '<h1>$1</h1>')
  .replace(/^## (.+)$/gm, '<h2>$1</h2>')
  .replace(/^\*\*(.+?)\*\*$/gm, '<p><strong>$1</strong></p>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/^\| (.+) \|$/gm, (line) => {
    const cells = line.split('|').map(c => c.trim()).filter(Boolean)
    const isHeader = cells.every(c => /^-+$/.test(c))
    if (isHeader) return ''
    return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>'
  })
  .replace(/(<tr>[\s\S]*?<\/tr>)/g, (block) => `<table>${block}</table>`)
  .replace(/^- (.+)$/gm, '<li>$1</li>')
  .replace(/(<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`)
  .replace(/\n\n/g, '</p><p>')
  .replace(/^(?!<[huplt])(.*\S.*)$/gm, '<p>$1</p>')
}
</body>
</html>`
}
