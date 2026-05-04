import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, departments, tasks } from '@/lib/db/schema'
import { eq, count, sql } from 'drizzle-orm'

// GET /api/users — list all users with department and task counts
// Query param: ?departmentId=<uuid> to filter
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const departmentId = searchParams.get('departmentId')

  // Subquery: active task count per user
  const activeTaskCounts = db
    .select({
      assigneeId: tasks.assigneeId,
      activeCount: count(tasks.id).as('active_count'),
    })
    .from(tasks)
    .where(sql`${tasks.status} != 'done'`)
    .groupBy(tasks.assigneeId)
    .as('active_task_counts')

  const query = db
    .select({
      id:           users.id,
      name:         users.name,
      email:        users.email,
      role:         users.role,
      avatarUrl:    users.avatarUrl,
      createdAt:    users.createdAt,
      departmentId: users.departmentId,
      departmentName: departments.name,
      departmentSlug: departments.slug,
      departmentColor: departments.color,
      activeTaskCount: sql<number>`coalesce(${activeTaskCounts.activeCount}, 0)`,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .leftJoin(activeTaskCounts, eq(users.id, activeTaskCounts.assigneeId))

  const rows = departmentId
    ? await query.where(eq(users.departmentId, departmentId))
    : await query

  return NextResponse.json(rows)
}
