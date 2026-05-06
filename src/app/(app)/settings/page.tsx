import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users, departments } from '@/lib/db/schema'
import { eq, count, sql } from 'drizzle-orm'
import { SettingsClient } from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const currentUserId = session.user.id

  const [currentUser] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, avatarUrl: users.avatarUrl, departmentId: users.departmentId, dailyReportEmail: users.dailyReportEmail })
    .from(users)
    .where(eq(users.id, currentUserId))
    .limit(1)

  const isAdmin = currentUser?.role === 'admin'

  // Subquery: member count per department
  const memberCounts = db
    .select({
      departmentId: users.departmentId,
      memberCount:  count(users.id).as('member_count'),
    })
    .from(users)
    .groupBy(users.departmentId)
    .as('member_counts')

  const [allUsers, allDepts] = await Promise.all([
    db
      .select({
        id:           users.id,
        name:         users.name,
        email:        users.email,
        role:         users.role,
        avatarUrl:    users.avatarUrl,
        departmentId: users.departmentId,
      })
      .from(users)
      .orderBy(users.name),

    db
      .select({
        id:          departments.id,
        name:        departments.name,
        slug:        departments.slug,
        color:       departments.color,
        createdAt:   departments.createdAt,
        memberCount: sql<number>`coalesce(${memberCounts.memberCount}, 0)`,
      })
      .from(departments)
      .leftJoin(memberCounts, eq(departments.id, memberCounts.departmentId))
      .orderBy(departments.name),
  ])

  return (
    <SettingsClient
      currentUser={currentUser!}
      isAdmin={isAdmin}
      allUsers={allUsers}
      departments={allDepts}
    />
  )
}
