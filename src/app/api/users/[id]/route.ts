import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, departments, tasks, channelMembers, channels } from '@/lib/db/schema'
import { eq, and, count, sql, ne } from 'drizzle-orm'

// PATCH /api/users/[id] — update role / departmentId (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins may edit other users
  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (currentUser?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.role         !== undefined) updates.role         = body.role
  if (body.departmentId !== undefined) updates.departmentId = body.departmentId

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const [updated] = await db
    .update(users)
    .set(updates as any)
    .where(eq(users.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

// GET /api/users/[id] — user profile with active tasks and completed tasks this month
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // User + department
  const [user] = await db
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

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Active tasks (not done)
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
    .limit(20)

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

  return NextResponse.json({
    ...user,
    activeTasks,
    completedThisMonth: completedRow?.count ?? 0,
    channels: userChannels,
  })
}
