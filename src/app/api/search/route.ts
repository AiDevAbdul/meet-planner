import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, meetings, users } from '@/lib/db/schema'
import { ilike, or } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ tasks: [], meetings: [], users: [] })

  const pattern = `%${q}%`

  const [matchedTasks, matchedMeetings, matchedUsers] = await Promise.all([
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
      .from(tasks)
      .where(or(ilike(tasks.title, pattern), ilike(tasks.description, pattern)))
      .limit(6),

    db
      .select({ id: meetings.id, title: meetings.title, summary: meetings.summary, date: meetings.date })
      .from(meetings)
      .where(or(ilike(meetings.title, pattern), ilike(meetings.summary, pattern)))
      .limit(4),

    db
      .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl, role: users.role })
      .from(users)
      .where(or(ilike(users.name, pattern), ilike(users.email, pattern)))
      .limit(4),
  ])

  return NextResponse.json({ tasks: matchedTasks, meetings: matchedMeetings, users: matchedUsers })
}
