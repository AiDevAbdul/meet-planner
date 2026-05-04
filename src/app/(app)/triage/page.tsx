import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, meetings, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { TriageClient } from './TriageClient'

export const dynamic = 'force-dynamic'

export default async function TriagePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Role check — only admin or manager can access triage
  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    redirect('/dashboard')
  }

  // Fetch all triage tasks with meeting info
  const triagedTasks = await db
    .select({
      id:          tasks.id,
      title:       tasks.title,
      description: tasks.description,
      priority:    tasks.priority,
      status:      tasks.status,
      assigneeId:  tasks.assigneeId,
      dueDate:     tasks.dueDate,
      meetingId:   tasks.meetingId,
      position:    tasks.position,
      createdAt:   tasks.createdAt,
    })
    .from(tasks)
    .where(eq(tasks.status, 'triage'))
    .orderBy(tasks.createdAt)

  // Fetch related meetings
  const meetingIds = [...new Set(triagedTasks.map(t => t.meetingId).filter(Boolean))] as string[]
  const meetingMap: Record<string, { id: string; title: string; source: string; date: string | null }> = {}
  await Promise.all(
    meetingIds.map(async mid => {
      const [m] = await db
        .select({ id: meetings.id, title: meetings.title, source: meetings.source, date: meetings.date })
        .from(meetings)
        .where(eq(meetings.id, mid))
        .limit(1)
      if (m) meetingMap[m.id] = m
    })
  )

  // Fetch assignees
  const assigneeIds = [...new Set(triagedTasks.map(t => t.assigneeId).filter(Boolean))] as string[]
  const assigneeMap: Record<string, { id: string; name: string; email: string; avatarUrl: string | null }> = {}
  await Promise.all(
    assigneeIds.map(async aid => {
      const [u] = await db
        .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, aid))
        .limit(1)
      if (u) assigneeMap[u.id] = u
    })
  )

  // Enrich tasks
  const enriched = triagedTasks.map(t => ({
    ...t,
    meeting:  t.meetingId ? (meetingMap[t.meetingId] ?? null) : null,
    assignee: t.assigneeId ? (assigneeMap[t.assigneeId] ?? null) : null,
  }))

  // All users for reassignment
  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
    .from(users)
    .orderBy(users.name)

  return <TriageClient tasks={enriched} allUsers={allUsers} />
}
