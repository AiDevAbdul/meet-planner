import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { goals, keyResults, users, departments } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { GoalsClient } from './GoalsClient'

export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [goalRows, krRows, allUsers, allDepts] = await Promise.all([
    db
      .select({
        id:           goals.id,
        title:        goals.title,
        description:  goals.description,
        level:        goals.level,
        status:       goals.status,
        ownerId:      goals.ownerId,
        teamId:       goals.teamId,
        startDate:    goals.startDate,
        endDate:      goals.endDate,
        parentGoalId: goals.parentGoalId,
        createdBy:    goals.createdBy,
        createdAt:    goals.createdAt,
        ownerName:    users.name,
        ownerImage:   users.image,
      })
      .from(goals)
      .leftJoin(users, eq(goals.ownerId, users.id))
      .orderBy(goals.level, desc(goals.createdAt)),

    db.select().from(keyResults).orderBy(keyResults.createdAt),

    db.select({ id: users.id, name: users.name, image: users.image, role: users.role })
      .from(users)
      .orderBy(users.name),

    db.select({ id: departments.id, name: departments.name, color: departments.color })
      .from(departments)
      .orderBy(departments.name),
  ])

  return (
    <GoalsClient
      initialGoals={goalRows}
      initialKeyResults={krRows}
      allUsers={allUsers}
      allDepts={allDepts}
      currentUserId={session.user.id}
      currentUserRole={(session.user as any).role ?? 'member'}
    />
  )
}
