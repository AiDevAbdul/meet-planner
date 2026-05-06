import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { projects, projectMembers, users, tasks } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { ProjectsClient } from './ProjectsClient'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
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
      icon:        projects.icon,
      startDate:   projects.startDate,
      endDate:     projects.endDate,
      createdAt:   projects.createdAt,
      ownerName:   users.name,
      ownerImage:  users.image,
    })
    .from(projects)
    .leftJoin(users, eq(projects.ownerId, users.id))
    .orderBy(desc(projects.createdAt))

  const allMembers = rows.length > 0
    ? await db.select({ projectId: projectMembers.projectId }).from(projectMembers)
    : []

  const allTasks = rows.length > 0
    ? await db.select({ projectId: tasks.projectId, status: tasks.status }).from(tasks)
    : []

  const memberMap: Record<string, number> = {}
  for (const m of allMembers) {
    if (m.projectId) memberMap[m.projectId] = (memberMap[m.projectId] ?? 0) + 1
  }

  const taskMap: Record<string, { total: number; done: number }> = {}
  for (const t of allTasks) {
    if (!t.projectId) continue
    if (!taskMap[t.projectId]) taskMap[t.projectId] = { total: 0, done: 0 }
    taskMap[t.projectId].total++
    if (t.status === 'done') taskMap[t.projectId].done++
  }

  const data = rows.map(r => ({
    ...r,
    memberCount: memberMap[r.id] ?? 0,
    taskTotal:   taskMap[r.id]?.total ?? 0,
    taskDone:    taskMap[r.id]?.done  ?? 0,
  }))

  return <ProjectsClient initialProjects={data} />
}
