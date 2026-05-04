import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetings, tasks, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { extractMeeting } from '@/lib/ai/extractMeeting'

async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())

  if (name.endsWith('.txt')) {
    return buffer.toString('utf-8')
  }

  if (name.endsWith('.pdf')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse')
    const data = await pdfParse(buffer)
    return data.text
  }

  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error(`Unsupported file type: ${file.name}`)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  let rawContent: string
  try {
    rawContent = await extractTextFromFile(file)
  } catch (err) {
    return NextResponse.json(
      { error: `Could not read file: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 400 }
    )
  }

  if (!rawContent.trim()) {
    return NextResponse.json({ error: 'File appears to be empty or unreadable' }, { status: 400 })
  }

  const roster = await db
    .select({ name: users.name, email: users.email, role: users.role })
    .from(users)

  const [meeting] = await db
    .insert(meetings)
    .values({
      title:      'Processing…',
      source:     'manual',
      rawContent,
      createdBy:  session.user.id,
    })
    .returning()

  try {
    const extracted = await extractMeeting(rawContent, roster)

    await db
      .update(meetings)
      .set({
        title:     extracted.title,
        summary:   extracted.summary,
        date:      extracted.date ?? null,
        decisions: extracted.decisions,
        attendees: extracted.attendees,
      })
      .where(eq(meetings.id, meeting.id))

    const userMap: Record<string, string> = {}
    for (const u of roster) userMap[u.name.toLowerCase()] = u.email

    const fullUsers = await db.select({ id: users.id, email: users.email }).from(users)
    const emailToId: Record<string, string> = {}
    for (const u of fullUsers) emailToId[u.email.toLowerCase()] = u.id

    if (extracted.tasks.length > 0) {
      const taskValues = extracted.tasks.map((t, i) => {
        let assigneeId: string | null = null
        if (t.assignee_name) {
          const email = userMap[t.assignee_name.toLowerCase()]
          if (email) assigneeId = emailToId[email.toLowerCase()] ?? null
        }
        return {
          title:       t.title,
          description: t.description ?? null,
          priority:    (t.priority ?? 'normal') as 'critical' | 'high' | 'normal' | 'low',
          status:      'triage' as const,
          assigneeId,
          createdBy:   session.user.id,
          meetingId:   meeting.id,
          dueDate:     t.due_date ?? null,
          position:    i,
        }
      })
      await db.insert(tasks).values(taskValues)
    }

    const [updatedMeeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meeting.id))
      .limit(1)

    const meetingTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.meetingId, meeting.id))

    return NextResponse.json({ meeting: updatedMeeting, tasks: meetingTasks }, { status: 201 })
  } catch (err) {
    console.error('[upload/extractMeeting] error:', err)
    await db
      .update(meetings)
      .set({ title: 'Meeting (extraction failed)' })
      .where(eq(meetings.id, meeting.id))

    return NextResponse.json({
      meeting,
      tasks:  [],
      error:  'AI extraction failed — meeting saved, please edit manually',
    }, { status: 207 })
  }
}
