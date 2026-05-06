import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { tasks, meetings, users, dailyReports } from '@/lib/db/schema'
import { count, desc, eq, ne, lt, and, isNotNull, gte } from 'drizzle-orm'
import { AnalyticsClient } from './AnalyticsClient'

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const now       = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const today      = now.toISOString().slice(0, 10)

  const [
    allTasks,
    allMeetings,
    meetingsThisMonthResult,
    overdueResult,
    reportsResult,
  ] = await Promise.all([
    db
      .select({ status: tasks.status, priority: tasks.priority, assigneeId: tasks.assigneeId })
      .from(tasks),

    db.select({ id: meetings.id }).from(meetings),

    db
      .select({ value: count() })
      .from(meetings)
      .where(gte(meetings.date, monthStart)),

    db
      .select({ value: count() })
      .from(tasks)
      .where(and(
        ne(tasks.status, 'done'),
        isNotNull(tasks.dueDate),
        lt(tasks.dueDate, today),
      )),

    db
      .select()
      .from(dailyReports)
      .orderBy(desc(dailyReports.date))
      .limit(60),
  ])

  const totalTasks      = allTasks.length
  const completedTasks  = allTasks.filter(t => t.status === 'done').length
  const overdueTasks    = Number(overdueResult[0]?.value ?? 0)
  const totalMeetings   = allMeetings.length
  const meetingsThisMonth = Number(meetingsThisMonthResult[0]?.value ?? 0)

  // Status breakdown
  const statusCounts: Record<string, number> = {}
  for (const t of allTasks) {
    statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1
  }
  const statusOrder = ['triage', 'todo', 'in_progress', 'review', 'done']
  const statusBreakdown = statusOrder.map(s => ({ status: s, count: statusCounts[s] ?? 0 }))

  // Priority breakdown
  const priorityCounts: Record<string, number> = {}
  for (const t of allTasks) {
    priorityCounts[t.priority] = (priorityCounts[t.priority] ?? 0) + 1
  }
  const priorityOrder = ['critical', 'high', 'normal', 'low']
  const priorityBreakdown = priorityOrder.map(p => ({ priority: p, count: priorityCounts[p] ?? 0 }))

  // Assignee workload
  const assigneeIds = [...new Set(allTasks.map(t => t.assigneeId).filter(Boolean) as string[])]
  let assigneeLoad: { name: string; total: number; done: number }[] = []

  if (assigneeIds.length > 0) {
    const members = await db
      .select({ id: users.id, name: users.name })
      .from(users)

    const memberMap = Object.fromEntries(members.map(u => [u.id, u.name]))

    const loadMap: Record<string, { total: number; done: number }> = {}
    for (const t of allTasks) {
      if (!t.assigneeId) continue
      if (!loadMap[t.assigneeId]) loadMap[t.assigneeId] = { total: 0, done: 0 }
      loadMap[t.assigneeId].total++
      if (t.status === 'done') loadMap[t.assigneeId].done++
    }

    assigneeLoad = Object.entries(loadMap)
      .map(([id, stats]) => ({
        name:  memberMap[id] ?? 'Unknown',
        total: stats.total,
        done:  stats.done,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12)
  }

  return (
    <AnalyticsClient
      totalTasks={totalTasks}
      completedTasks={completedTasks}
      overdueTasks={overdueTasks}
      totalMeetings={totalMeetings}
      statusBreakdown={statusBreakdown}
      priorityBreakdown={priorityBreakdown}
      assigneeLoad={assigneeLoad}
      meetingsThisMonth={meetingsThisMonth}
      dailyReports={reportsResult}
    />
  )
}
