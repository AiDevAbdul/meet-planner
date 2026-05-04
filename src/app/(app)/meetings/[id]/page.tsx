import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetings, tasks, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { MeetingDetailClient } from './MeetingDetailClient'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export default async function MeetingDetailPage({ params }: Props) {
  await auth()
  const { id } = await params

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1)

  if (!meeting) notFound()

  const meetingTasks = await db
    .select({
      id:          tasks.id,
      title:       tasks.title,
      description: tasks.description,
      priority:    tasks.priority,
      status:      tasks.status,
      assigneeId:  tasks.assigneeId,
      dueDate:     tasks.dueDate,
      position:    tasks.position,
      createdAt:   tasks.createdAt,
      updatedAt:   tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.meetingId, id))
    .orderBy(tasks.position)

  // Fetch assignees
  const assigneeIds = [...new Set(meetingTasks.map(t => t.assigneeId).filter(Boolean))] as string[]
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

  const enrichedTasks = meetingTasks.map(t => ({
    ...t,
    assignee: t.assigneeId ? (assigneeMap[t.assigneeId] ?? null) : null,
  }))

  // Fetch all users for reassignment dropdown
  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
    .from(users)
    .orderBy(users.name)

  return (
    <MeetingDetailClient
      meeting={{
        ...meeting,
        decisions: (meeting.decisions ?? []) as string[],
        attendees: (meeting.attendees ?? []) as { name: string; email: string }[],
      }}
      tasks={enrichedTasks}
      allUsers={allUsers}
    />
  )
}
