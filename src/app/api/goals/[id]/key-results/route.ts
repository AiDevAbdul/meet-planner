import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { keyResults } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const rows = await db.select().from(keyResults).where(eq(keyResults.goalId, id))
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { title, metricType, targetValue, currentValue, unit, startDate, dueDate } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const [row] = await db.insert(keyResults).values({
    goalId:       id,
    title:        title.trim(),
    metricType:   metricType ?? 'percentage',
    targetValue:  targetValue ?? 100,
    currentValue: currentValue ?? 0,
    unit:         unit || null,
    startDate:    startDate || null,
    dueDate:      dueDate || null,
  }).returning()

  return NextResponse.json(row, { status: 201 })
}
