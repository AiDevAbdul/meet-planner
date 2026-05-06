import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, users, projects, meetings } from '@/lib/db/schema'
import { eq, and, gte, lt, ne, isNotNull, count } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { google } from 'googleapis'

const anthropic = new Anthropic()

function getLastWeekRange() {
  const now   = new Date()
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(end)
  start.setDate(start.getDate() - 7)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { start, end } = getLastWeekRange()

  const [
    allTasks,
    completedThisWeek,
    overdueCount,
    meetingsThisWeek,
    managers,
    totalProjects,
  ] = await Promise.all([
    db.select({ status: tasks.status, priority: tasks.priority }).from(tasks),
    db.select({ value: count() }).from(tasks).where(
      and(isNotNull(tasks.completedAt), gte(tasks.completedAt as any, start), lt(tasks.completedAt as any, end))
    ),
    db.select({ value: count() }).from(tasks).where(
      and(ne(tasks.status, 'done'), isNotNull(tasks.dueDate), lt(tasks.dueDate, end))
    ),
    db.select({ value: count() }).from(meetings).where(
      and(isNotNull(meetings.date), gte(meetings.date, start))
    ),
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(and(users.dailyReportEmail)),
    db.select({ value: count() }).from(projects).where(eq(projects.status, 'active')),
  ])

  const recipients = managers.filter(u => u.role === 'manager' || u.role === 'admin')
  if (recipients.length === 0) return NextResponse.json({ skipped: true })

  const total      = allTasks.length
  const done       = allTasks.filter(t => t.status === 'done').length
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
  const completedCount = Number(completedThisWeek[0]?.value ?? 0)
  const overdue    = Number(overdueCount[0]?.value ?? 0)
  const meetingCount = Number(meetingsThisWeek[0]?.value ?? 0)
  const activeProjects = Number(totalProjects[0]?.value ?? 0)

  const prompt = `Generate a professional weekly AI digest email (HTML) for a project management team.

Stats for the week (${start} to ${end}):
- Tasks completed this week: ${completedCount}
- Overdue tasks: ${overdue}
- Overall completion rate: ${completionRate}% (${done}/${total})
- Meetings this week: ${meetingCount}
- Active projects: ${activeProjects}

Write a concise, professional HTML email with:
1. A brief executive summary (2–3 sentences)
2. Key metrics in a clean table
3. Highlights and areas to watch
4. A motivating closing note

Use inline styles for HTML formatting. Keep it under 400 words.`

  let html = ''
  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages:   [{ role: 'user', content: prompt }],
    })
    html = (msg.content[0] as { type: string; text: string }).text
  } catch {
    html = `<p>Weekly digest for ${start}–${end}. Completed: ${completedCount} tasks, Overdue: ${overdue}.</p>`
  }

  // Send via Gmail API
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    )
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    for (const recipient of recipients) {
      if (!recipient.email) continue
      const raw = Buffer.from(
        `To: ${recipient.email}\r\n` +
        `Subject: Weekly Team Digest — ${start}\r\n` +
        `Content-Type: text/html; charset=utf-8\r\n\r\n` +
        html
      ).toString('base64url')

      await gmail.users.messages.send({ userId: 'me', requestBody: { raw } }).catch(() => {})
    }
  } catch { /* email failure is non-fatal */ }

  return NextResponse.json({ ok: true, recipients: recipients.length })
}
