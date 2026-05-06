import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users, departments, tasks, userAvailability, userSkills } from '@/lib/db/schema'
import { ne, eq } from 'drizzle-orm'
import { WorkloadClient } from './WorkloadClient'

export const dynamic = 'force-dynamic'

export default async function WorkloadPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)

  const [allUsers, allDepartments, activeTasks, allAvailability, allSkills] = await Promise.all([
    db
      .select({
        id:           users.id,
        name:         users.name,
        email:        users.email,
        avatarUrl:    users.avatarUrl,
        role:         users.role,
        departmentId: users.departmentId,
      })
      .from(users)
      .orderBy(users.name),

    db
      .select({ id: departments.id, name: departments.name, slug: departments.slug, color: departments.color })
      .from(departments)
      .orderBy(departments.name),

    db
      .select({
        id:         tasks.id,
        title:      tasks.title,
        status:     tasks.status,
        priority:   tasks.priority,
        dueDate:    tasks.dueDate,
        projectId:  tasks.projectId,
        assigneeId: tasks.assigneeId,
      })
      .from(tasks)
      .where(ne(tasks.status, 'done')),

    db
      .select({
        id:             userAvailability.id,
        userId:         userAvailability.userId,
        date:           userAvailability.date,
        type:           userAvailability.type,
        hoursAvailable: userAvailability.hoursAvailable,
        note:           userAvailability.note,
      })
      .from(userAvailability),

    db
      .select({
        userId: userSkills.userId,
        skill:  userSkills.skill,
      })
      .from(userSkills),
  ])

  return (
    <WorkloadClient
      users={allUsers}
      departments={allDepartments}
      activeTasks={activeTasks}
      availability={allAvailability}
      skills={allSkills}
      today={today}
      currentUserId={session.user.id}
    />
  )
}
