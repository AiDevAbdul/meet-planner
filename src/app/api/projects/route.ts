import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, projectMembers, users, tasks } from '@/lib/db/schema'
import { eq, count, desc } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      budget:      projects.budget,
      createdAt:   projects.createdAt,
      updatedAt:   projects.updatedAt,
      ownerName:   users.name,
      ownerImage:  users.image,
    })
    .from(projects)
    .leftJoin(users, eq(projects.ownerId, users.id))
    .orderBy(desc(projects.createdAt))

  const projectIds = rows.map(r => r.id)

  const [memberCounts, taskCounts] = await Promise.all([
    projectIds.length > 0
      ? db
          .select({ projectId: projectMembers.projectId, cnt: count() })
          .from(projectMembers)
          .groupBy(projectMembers.projectId)
      : [],
    projectIds.length > 0
      ? db
          .select({ projectId: tasks.projectId, cnt: count(), doneCnt: count() })
          .from(tasks)
          .groupBy(tasks.projectId)
      : [],
  ])

  const memberMap = Object.fromEntries(memberCounts.map(r => [r.projectId, Number(r.cnt)]))

  const taskMap: Record<string, { total: number; done: number }> = {}
  for (const r of taskCounts) {
    if (r.projectId) taskMap[r.projectId] = { total: Number(r.cnt), done: 0 }
  }

  const allTasks = projectIds.length > 0
    ? await db
        .select({ projectId: tasks.projectId, status: tasks.status })
        .from(tasks)
    : []

  for (const t of allTasks) {
    if (!t.projectId) continue
    if (!taskMap[t.projectId]) taskMap[t.projectId] = { total: 0, done: 0 }
    if (t.status === 'done') taskMap[t.projectId].done++
  }

  const data = rows.map(r => ({
    ...r,
    memberCount: memberMap[r.id] ?? 0,
    taskTotal:   taskMap[r.id]?.total ?? 0,
    taskDone:    taskMap[r.id]?.done  ?? 0,
  }))

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, color, icon, startDate, endDate, budget } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const [project] = await db
    .insert(projects)
    .values({
      name:        name.trim(),
      description: description ?? null,
      status:      'planning',
      ownerId:     session.user.id,
      color:       color  ?? '#007AFF',
      icon:        icon   ?? 'Folder',
      startDate:   startDate ?? null,
      endDate:     endDate   ?? null,
      budget:      budget    ?? null,
    })
    .returning()

  await db.insert(projectMembers).values({
    projectId: project.id,
    userId:    session.user.id,
    role:      'owner',
  })

  return NextResponse.json(project, { status: 201 })
}
