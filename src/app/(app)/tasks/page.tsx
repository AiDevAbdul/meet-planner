import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, users, departments, milestones } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { TaskBoardClient } from './TaskBoardClient'

export const metadata = { title: 'Task Board — MeetPlanner' }

export default async function TasksPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [allTasks, allUsers, allDepartments, milestoneCounts] = await Promise.all([
    db
      .select({
        id:           tasks.id,
        title:        tasks.title,
        description:  tasks.description,
        priority:     tasks.priority,
        status:       tasks.status,
        assigneeId:   tasks.assigneeId,
        createdBy:    tasks.createdBy,
        meetingId:    tasks.meetingId,
        departmentId: tasks.departmentId,
        projectId:    tasks.projectId,
        dueDate:      tasks.dueDate,
        position:     tasks.position,
        createdAt:    tasks.createdAt,
        updatedAt:    tasks.updatedAt,
        assigneeName:      users.name,
        assigneeEmail:     users.email,
        assigneeAvatarUrl: users.avatarUrl,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .orderBy(tasks.position, tasks.createdAt),

    db
      .select({
        id:        users.id,
        name:      users.name,
        email:     users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users),

    db
      .select({
        id:   departments.id,
        name: departments.name,
        slug: departments.slug,
      })
      .from(departments),

    db
      .select({
        taskId: milestones.taskId,
        total:  sql<number>`count(*)::int`.as('total'),
        done:   sql<number>`count(*) filter (where ${milestones.status} = 'completed')::int`.as('done'),
      })
      .from(milestones)
      .groupBy(milestones.taskId),
  ])

  const milestoneMap = Object.fromEntries(milestoneCounts.map(m => [m.taskId, m]))

  const initialTasks = allTasks.map(t => ({
    ...t,
    milestoneTotal: milestoneMap[t.id]?.total ?? 0,
    milestoneDone:  milestoneMap[t.id]?.done  ?? 0,
  }))

  return (
    <TaskBoardClient
      initialTasks={initialTasks}
      users={allUsers}
      departments={allDepartments}
      currentUserId={session.user.id}
    />
  )
}
