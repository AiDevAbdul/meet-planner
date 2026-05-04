import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, departments, tasks } from '@/lib/db/schema'
import { eq, count, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? 'duckercreative.com'

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

// POST /api/users — admin-only: create a new team member
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check requester is admin
  const [requester] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (requester?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const { name, email, password, role, departmentId } = await req.json()

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
  }

  const normalised = email.toLowerCase().trim()

  if (!normalised.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return NextResponse.json(
      { error: `Only @${ALLOWED_DOMAIN} email addresses are allowed` },
      { status: 400 },
    )
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, normalised) })
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
  }

  const validRoles = ['admin', 'manager', 'member', 'viewer']
  const assignedRole = validRoles.includes(role) ? role : 'member'

  const passwordHash = await bcrypt.hash(password, 12)

  const [user] = await db
    .insert(users)
    .values({
      name:         name.trim(),
      email:        normalised,
      passwordHash,
      role:         assignedRole,
      departmentId: departmentId ?? null,
    })
    .returning({
      id:           users.id,
      name:         users.name,
      email:        users.email,
      role:         users.role,
      avatarUrl:    users.avatarUrl,
      departmentId: users.departmentId,
    })

  return NextResponse.json(user, { status: 201 })
}
