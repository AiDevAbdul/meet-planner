import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, users, departments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { TaskBoardClient } from './TaskBoardClient'

export const metadata = { title: 'Task Board — MeetPlanner' }

export default async function TasksPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [allTasks, allUsers, allDepartments] = await Promise.all([
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
  ])

  return (
    <TaskBoardClient
      initialTasks={allTasks}
      users={allUsers}
      departments={allDepartments}
      currentUserId={session.user.id}
    />
  )
}
