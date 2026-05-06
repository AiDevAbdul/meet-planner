import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projectMembers, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const rows = await db
    .select({
      userId:    projectMembers.userId,
      role:      projectMembers.role,
      joinedAt:  projectMembers.joinedAt,
      userName:  users.name,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(projectMembers)
    .leftJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, id))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { userId, role } = await req.json()

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  await db
    .insert(projectMembers)
    .values({ projectId: id, userId, role: role ?? 'member' })
    .onConflictDoUpdate({
      target: [projectMembers.projectId, projectMembers.userId],
      set: { role: role ?? 'member' },
    })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = req.nextUrl
  const userId = searchParams.get('userId')

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)))

  return NextResponse.json({ ok: true })
}
