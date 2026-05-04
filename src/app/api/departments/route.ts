import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { departments, users, tasks } from '@/lib/db/schema'
import { eq, count, sql } from 'drizzle-orm'

// GET /api/departments — list departments with member count and task count
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const memberCounts = db
    .select({
      departmentId: users.departmentId,
      memberCount: count(users.id).as('member_count'),
    })
    .from(users)
    .groupBy(users.departmentId)
    .as('member_counts')

  const taskCounts = db
    .select({
      departmentId: tasks.departmentId,
      taskCount: count(tasks.id).as('task_count'),
    })
    .from(tasks)
    .where(sql`${tasks.status} != 'done'`)
    .groupBy(tasks.departmentId)
    .as('task_counts')

  const rows = await db
    .select({
      id:          departments.id,
      name:        departments.name,
      slug:        departments.slug,
      color:       departments.color,
      createdAt:   departments.createdAt,
      memberCount: sql<number>`coalesce(${memberCounts.memberCount}, 0)`,
      taskCount:   sql<number>`coalesce(${taskCounts.taskCount}, 0)`,
    })
    .from(departments)
    .leftJoin(memberCounts, eq(departments.id, memberCounts.departmentId))
    .leftJoin(taskCounts, eq(departments.id, taskCounts.departmentId))
    .orderBy(departments.name)

  return NextResponse.json(rows)
}

// POST /api/departments — create department (admin only)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch role from DB
  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (currentUser?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, slug, color } = body

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const [dept] = await db
    .insert(departments)
    .values({
      name:  name.trim(),
      slug:  slug.trim().toLowerCase().replace(/\s+/g, '-'),
      color: color ?? null,
    })
    .returning()

  return NextResponse.json(dept, { status: 201 })
}
