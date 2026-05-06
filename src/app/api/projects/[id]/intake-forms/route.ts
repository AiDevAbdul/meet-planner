import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { intakeForms, projectMembers } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const membership = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, session.user.id)))
    .limit(1)

  if (!membership.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await db
    .select()
    .from(intakeForms)
    .where(eq(intakeForms.projectId, id))
    .orderBy(desc(intakeForms.createdAt))

  return NextResponse.json(rows)
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const membership = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, session.user.id)))
    .limit(1)

  if (!membership.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['owner', 'manager'].includes(membership[0].role)) {
    return NextResponse.json({ error: 'Only owners and managers can create forms' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, fields = [] } = body

  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  // Build unique slug
  const base = toSlug(name)
  const suffix = Math.random().toString(36).slice(2, 7)
  const slug = `${base}-${suffix}`

  const [row] = await db.insert(intakeForms).values({
    projectId:   id,
    name:        name.trim(),
    slug,
    description: description?.trim() || null,
    fields,
    createdBy:   session.user.id,
  }).returning()

  return NextResponse.json(row, { status: 201 })
}
