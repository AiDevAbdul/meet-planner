import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, projectMembers, users, tasks, meetings } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [project] = await db
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
    .where(eq(projects.id, id))

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [members, projectTasks, projectMeetings] = await Promise.all([
    db
      .select({
        userId:    projectMembers.userId,
        role:      projectMembers.role,
        joinedAt:  projectMembers.joinedAt,
        userName:  users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(projectMembers)
      .leftJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, id)),

    db
      .select({
        id:       tasks.id,
        title:    tasks.title,
        status:   tasks.status,
        priority: tasks.priority,
        dueDate:  tasks.dueDate,
        assigneeId: tasks.assigneeId,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(eq(tasks.projectId, id))
      .limit(100),

    db
      .select({ id: meetings.id, title: meetings.title, date: meetings.date })
      .from(meetings)
      .where(eq(meetings.projectId, id))
      .limit(20),
  ])

  return NextResponse.json({ ...project, members, tasks: projectTasks, meetings: projectMeetings })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const allowed = ['name', 'description', 'status', 'color', 'icon', 'startDate', 'endDate', 'budget']
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of allowed) {
    if (key in body) updates[key === 'startDate' ? 'startDate' : key === 'endDate' ? 'endDate' : key] = body[key]
  }

  const [updated] = await db
    .update(projects)
    .set(updates as any)
    .where(eq(projects.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [member] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, session.user.id)))

  if (!member || !['owner', 'manager'].includes(member.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.delete(projects).where(eq(projects.id, id))
  return NextResponse.json({ ok: true })
}
