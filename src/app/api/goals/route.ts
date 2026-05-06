import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { goals, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select({
      id:          goals.id,
      title:       goals.title,
      description: goals.description,
      level:       goals.level,
      status:      goals.status,
      ownerId:     goals.ownerId,
      teamId:      goals.teamId,
      startDate:   goals.startDate,
      endDate:     goals.endDate,
      parentGoalId: goals.parentGoalId,
      createdBy:   goals.createdBy,
      createdAt:   goals.createdAt,
      updatedAt:   goals.updatedAt,
      ownerName:   users.name,
      ownerImage:  users.image,
    })
    .from(goals)
    .leftJoin(users, eq(goals.ownerId, users.id))
    .orderBy(goals.level, desc(goals.createdAt))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, level, ownerId, teamId, status, startDate, endDate, parentGoalId } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const [row] = await db.insert(goals).values({
    title:        title.trim(),
    description:  description || null,
    level:        level ?? 'company',
    ownerId:      ownerId || session.user.id,
    teamId:       teamId || null,
    status:       status ?? 'active',
    startDate:    startDate || null,
    endDate:      endDate || null,
    parentGoalId: parentGoalId || null,
    createdBy:    session.user.id,
  }).returning()

  return NextResponse.json(row, { status: 201 })
}
