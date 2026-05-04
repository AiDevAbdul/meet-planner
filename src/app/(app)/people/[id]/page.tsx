import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users, departments, tasks, channelMembers, channels } from '@/lib/db/schema'
import { eq, and, count, ne, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { PersonProfileClient } from './PersonProfileClient'

export const dynamic = 'force-dynamic'

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const currentUserId = session.user.id

  // Current user's role (for admin controls)
  const [currentUserRow] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, currentUserId))
    .limit(1)

  const isAdmin = currentUserRow?.role === 'admin'

  // Profile
  const [profile] = await db
    .select({
      id:              users.id,
      name:            users.name,
      email:           users.email,
      role:            users.role,
      avatarUrl:       users.avatarUrl,
      createdAt:       users.createdAt,
      departmentId:    users.departmentId,
      departmentName:  departments.name,
      departmentSlug:  departments.slug,
      departmentColor: departments.color,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.id, id))
    .limit(1)

  if (!profile) notFound()

  // Active tasks (up to 5 displayed)
  const activeTasks = await db
    .select({
      id:       tasks.id,
      title:    tasks.title,
      status:   tasks.status,
      priority: tasks.priority,
      dueDate:  tasks.dueDate,
    })
    .from(tasks)
    .where(and(eq(tasks.assigneeId, id), ne(tasks.status, 'done')))
    .orderBy(tasks.dueDate, tasks.createdAt)
    .limit(5)

  // Completed tasks count this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const [completedRow] = await db
    .select({ count: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.assigneeId, id),
        eq(tasks.status, 'done'),
        sql`${tasks.updatedAt} >= ${monthStart}`,
      )
    )

  // Channel memberships
  const userChannels = await db
    .select({
      channelId:   channels.id,
      channelName: channels.name,
      channelSlug: channels.slug,
      channelType: channels.type,
    })
    .from(channelMembers)
    .innerJoin(channels, eq(channelMembers.channelId, channels.id))
    .where(eq(channelMembers.userId, id))

  // All departments (for admin role/dept edit)
  const allDepartments = isAdmin
    ? await db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .orderBy(departments.name)
    : []

  return (
    <PersonProfileClient
      profile={profile}
      activeTasks={activeTasks}
      completedThisMonth={completedRow?.count ?? 0}
      channels={userChannels}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      allDepartments={allDepartments}
    />
  )
}
