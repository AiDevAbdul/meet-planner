import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, meetings, notifications } from '@/lib/db/schema'
import { eq, and, lte, lt, count, desc } from 'drizzle-orm'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const session = await auth()
  const userId  = session!.user.id

  const today = new Date().toISOString().slice(0, 10)

  const [tasksDueToday, overdueCount, unreadCount, myTasks, recentMeetings, activityFeed] =
    await Promise.all([
      db.select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority, dueDate: tasks.dueDate })
        .from(tasks)
        .where(and(eq(tasks.assigneeId, userId), eq(tasks.dueDate, today))),

      db.select({ count: count() }).from(tasks)
        .where(and(eq(tasks.assigneeId, userId), lt(tasks.dueDate, today))),

      db.select({ count: count() }).from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false))),

      db.select({
        id: tasks.id, title: tasks.title, status: tasks.status,
        priority: tasks.priority, dueDate: tasks.dueDate,
      }).from(tasks)
        .where(eq(tasks.assigneeId, userId))
        .orderBy(desc(tasks.updatedAt))
        .limit(20),

      db.select({
        id: meetings.id, title: meetings.title, summary: meetings.summary,
        date: meetings.date, source: meetings.source,
      }).from(meetings)
        .orderBy(desc(meetings.createdAt))
        .limit(3),

      db.select({
        id: tasks.id, title: tasks.title, status: tasks.status, updatedAt: tasks.updatedAt,
      }).from(tasks)
        .orderBy(desc(tasks.updatedAt))
        .limit(10),
    ])

  return (
    <DashboardClient
      tasksDueToday={tasksDueToday.length}
      overdueCount={overdueCount[0]?.count ?? 0}
      unreadCount={unreadCount[0]?.count ?? 0}
      myTasks={myTasks}
      recentMeetings={recentMeetings}
      activityFeed={activityFeed}
    />
  )
}
