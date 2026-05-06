import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sprints, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params

  const rows = await db
    .select({
      id:           sprints.id,
      projectId:    sprints.projectId,
      name:         sprints.name,
      goal:         sprints.goal,
      startDate:    sprints.startDate,
      endDate:      sprints.endDate,
      status:       sprints.status,
      retroSummary: sprints.retroSummary,
      createdAt:    sprints.createdAt,
      creatorName:  users.name,
    })
    .from(sprints)
    .leftJoin(users, eq(sprints.createdBy, users.id))
    .where(eq(sprints.projectId, projectId))
    .orderBy(desc(sprints.createdAt))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json()

  const [sprint] = await db.insert(sprints).values({
    projectId,
    name:      body.name,
    goal:      body.goal ?? null,
    startDate: body.startDate,
    endDate:   body.endDate,
    status:    'planning',
    createdBy: session.user.id,
  }).returning()

  return NextResponse.json(sprint, { status: 201 })
}
