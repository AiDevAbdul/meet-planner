import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetings, tasks } from '@/lib/db/schema'
import { desc, inArray } from 'drizzle-orm'
import { MeetingsClient } from './MeetingsClient'

export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

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
    .limit(50)

  // Task counts — scoped to the meetings on this page
  const meetingIds = rows.map(r => r.id)
  const allTasks = meetingIds.length > 0
    ? await db
        .select({ meetingId: tasks.meetingId, id: tasks.id })
        .from(tasks)
        .where(inArray(tasks.meetingId, meetingIds))
    : []

  const taskCounts: Record<string, number> = {}
  for (const t of allTasks) {
    if (t.meetingId) {
      taskCounts[t.meetingId] = (taskCounts[t.meetingId] ?? 0) + 1
    }
  }

  const data = rows.map(r => ({
    ...r,
    attendees: (r.attendees ?? []) as { name: string; email: string }[],
    decisions: (r.decisions ?? []) as string[],
    taskCount: taskCounts[r.id] ?? 0,
  }))

  return <MeetingsClient initialMeetings={data} />
}
