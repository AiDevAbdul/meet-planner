import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { projects, projectMembers, users, tasks } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { PortfolioClient } from './PortfolioClient'

export const dynamic = 'force-dynamic'

export default async function PortfolioPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const rows = await db
    .select({
      id:          projects.id,
      name:        projects.name,
      description: projects.description,
      status:      projects.status,
      ownerId:     projects.ownerId,
      color:       projects.color,
      startDate:   projects.startDate,
      endDate:     projects.endDate,
      createdAt:   projects.createdAt,
      ownerName:   users.name,
    })
    .from(projects)
    .leftJoin(users, eq(projects.ownerId, users.id))
    .orderBy(desc(projects.createdAt))

  const allMembers = rows.length > 0
    ? await db.select({ projectId: projectMembers.projectId }).from(projectMembers)
    : []

  const allTasks = rows.length > 0
    ? await db.select({ projectId: tasks.projectId, status: tasks.status, priority: tasks.priority, dueDate: tasks.dueDate }).from(tasks)
    : []

  const memberMap: Record<string, number> = {}
  for (const m of allMembers) {
    if (m.projectId) memberMap[m.projectId] = (memberMap[m.projectId] ?? 0) + 1
  }

  const today = new Date().toISOString().slice(0, 10)
  const taskMap: Record<string, { total: number; done: number; overdue: number; critical: number }> = {}
  for (const t of allTasks) {
    if (!t.projectId) continue
    if (!taskMap[t.projectId]) taskMap[t.projectId] = { total: 0, done: 0, overdue: 0, critical: 0 }
    taskMap[t.projectId].total++
    if (t.status === 'done') taskMap[t.projectId].done++
    if (t.status !== 'done' && t.dueDate && t.dueDate < today) taskMap[t.projectId].overdue++
    if (t.priority === 'critical' && t.status !== 'done') taskMap[t.projectId].critical++
  }

  const data = rows.map(r => {
    const tm = taskMap[r.id] ?? { total: 0, done: 0, overdue: 0, critical: 0 }
    const pct = tm.total > 0 ? Math.round((tm.done / tm.total) * 100) : 0

    let health: 'green' | 'yellow' | 'red' = 'green'
    if (tm.overdue > 2 || tm.critical > 1) health = 'red'
    else if (tm.overdue > 0 || tm.critical > 0) health = 'yellow'

    const days = r.endDate
      ? Math.ceil((new Date(r.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    if (days !== null && days < 0 && r.status !== 'completed') health = 'red'

    return {
      ...r,
      memberCount: memberMap[r.id] ?? 0,
      taskTotal:   tm.total,
      taskDone:    tm.done,
      overdueTasks: tm.overdue,
      criticalTasks: tm.critical,
      percentComplete: pct,
      health,
      daysRemaining: days,
    }
  })

  return <PortfolioClient projects={data} />
}
