import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { projects, projectMembers, users, tasks, meetings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ProjectDetailClient } from './ProjectDetailClient'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

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

  if (!project) notFound()

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
        id:         tasks.id,
        title:      tasks.title,
        status:     tasks.status,
        priority:   tasks.priority,
        dueDate:    tasks.dueDate,
        assigneeId: tasks.assigneeId,
        createdAt:  tasks.createdAt,
        assigneeName: users.name,
        assigneeImage: users.image,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(eq(tasks.projectId, id))
      .orderBy(tasks.createdAt),

    db
      .select({ id: meetings.id, title: meetings.title, date: meetings.date, source: meetings.source })
      .from(meetings)
      .where(eq(meetings.projectId, id))
      .orderBy(meetings.createdAt),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const taskStats = {
    total:   projectTasks.length,
    done:    projectTasks.filter(t => t.status === 'done').length,
    overdue: projectTasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < today).length,
  }

  return (
    <ProjectDetailClient
      project={project}
      members={members}
      tasks={projectTasks as any}
      meetings={projectMeetings}
      taskStats={taskStats}
      currentUserId={session.user.id}
    />
  )
}
