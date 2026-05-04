import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, departments, tasks } from '@/lib/db/schema'
import { eq, count, sql } from 'drizzle-orm'
import { PeopleClient } from './PeopleClient'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
  const session = await auth()
  const currentUserId = session!.user.id

  // Task counts per user (active and total)
  const activeTaskCounts = db
    .select({
      assigneeId:  tasks.assigneeId,
      activeCount: count(tasks.id).as('active_count'),
    })
    .from(tasks)
    .where(sql`${tasks.status} != 'done'`)
    .groupBy(tasks.assigneeId)
    .as('active_task_counts')

  const totalTaskCounts = db
    .select({
      assigneeId:  tasks.assigneeId,
      totalCount:  count(tasks.id).as('total_count'),
    })
    .from(tasks)
    .groupBy(tasks.assigneeId)
    .as('total_task_counts')

  const doneTaskCounts = db
    .select({
      assigneeId: tasks.assigneeId,
      doneCount:  count(tasks.id).as('done_count'),
    })
    .from(tasks)
    .where(sql`${tasks.status} = 'done'`)
    .groupBy(tasks.assigneeId)
    .as('done_task_counts')

  const [allUsers, allDepartments] = await Promise.all([
    db
      .select({
        id:              users.id,
        name:            users.name,
        email:           users.email,
        role:            users.role,
        avatarUrl:       users.avatarUrl,
        departmentId:    users.departmentId,
        departmentName:  departments.name,
        departmentSlug:  departments.slug,
        departmentColor: departments.color,
        activeTaskCount: sql<number>`coalesce(${activeTaskCounts.activeCount}, 0)`,
        totalTaskCount:  sql<number>`coalesce(${totalTaskCounts.totalCount}, 0)`,
        doneTaskCount:   sql<number>`coalesce(${doneTaskCounts.doneCount}, 0)`,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(activeTaskCounts, eq(users.id, activeTaskCounts.assigneeId))
      .leftJoin(totalTaskCounts,  eq(users.id, totalTaskCounts.assigneeId))
      .leftJoin(doneTaskCounts,   eq(users.id, doneTaskCounts.assigneeId))
      .orderBy(users.name),

    db
      .select({ id: departments.id, name: departments.name, slug: departments.slug, color: departments.color })
      .from(departments)
      .orderBy(departments.name),
  ])

  return (
    <PeopleClient
      users={allUsers}
      departments={allDepartments}
      currentUserId={currentUserId}
    />
  )
}
