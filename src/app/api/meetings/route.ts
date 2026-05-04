import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetings, tasks, users } from '@/lib/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { extractMeeting } from '@/lib/ai/extractMeeting'

// ─── GET /api/meetings ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))
  const offset = (page - 1) * limit

  const rows = await db
    .select({
      id:        meetings.id,
      title:     meetings.title,
      source:    meetings.source,
      summary:   meetings.summary,
      date:      meetings.date,
      decisions: meetings.decisions,
      attendees: meetings.attendees,
      createdAt: meetings.createdAt,
    })
    .from(meetings)
    .orderBy(desc(meetings.createdAt))
    .limit(limit)
    .offset(offset)

  // Attach task counts per meeting
  const meetingIds = rows.map(r => r.id)
  let taskCounts: Record<string, number> = {}

  if (meetingIds.length > 0) {
    const allTasks = await db
      .select({ meetingId: tasks.meetingId, id: tasks.id })
      .from(tasks)
      .where(inArray(tasks.meetingId, meetingIds))
    // Count per meeting
    for (const t of allTasks) {
      if (t.meetingId) {
        taskCounts[t.meetingId] = (taskCounts[t.meetingId] ?? 0) + 1
      }
    }
  }

  const data = rows.map(r => ({ ...r, taskCount: taskCounts[r.id] ?? 0 }))

  return NextResponse.json({ data, page, limit })
}

// ─── POST /api/meetings ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { rawContent, source = 'manual' } = body as {
    rawContent: string
    source?: 'gmail' | 'manual' | 'google_meet'
  }

  if (!rawContent?.trim()) {
    return NextResponse.json({ error: 'rawContent is required' }, { status: 400 })
  }

  // Fetch team roster for AI extraction
  const roster = await db
    .select({ name: users.name, email: users.email, role: users.role })
    .from(users)

  // Insert a placeholder meeting first so we can reference it for tasks
  const [meeting] = await db
    .insert(meetings)
    .values({
      title:      'Processing…',
      source:     source as 'gmail' | 'manual' | 'google_meet',
      rawContent,
      createdBy:  session.user.id,
    })
    .returning()

  // Run AI extraction (non-blocking — update in place)
  try {
    const extracted = await extractMeeting(rawContent, roster)

    // Update the meeting with extracted data
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

    // Build a map from name -> userId for matched assignees
    const userMap: Record<string, string> = {}
    for (const u of roster) {
      userMap[u.name.toLowerCase()] = u.email
    }
    const emailToId: Record<string, string> = {}
    const fullUsers = await db.select({ id: users.id, email: users.email }).from(users)
    for (const u of fullUsers) {
      emailToId[u.email.toLowerCase()] = u.id
    }

    // Insert extracted tasks in triage status
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
          assigneeId:  assigneeId,
          createdBy:   session.user.id,
          meetingId:   meeting.id,
          dueDate:     t.due_date ?? null,
          position:    i,
        }
      })

      await db.insert(tasks).values(taskValues)
    }

    const updatedMeeting = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meeting.id))
      .limit(1)

    const meetingTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.meetingId, meeting.id))

    return NextResponse.json({
      meeting: updatedMeeting[0],
      tasks:   meetingTasks,
    }, { status: 201 })
  } catch (err) {
    console.error('[extractMeeting] error:', err)
    // Still return the meeting even if extraction failed
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
