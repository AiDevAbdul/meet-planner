import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { keyResults } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { title, metricType, targetValue, currentValue, unit, startDate, dueDate } = body

  const [row] = await db
    .update(keyResults)
    .set({
      ...(title !== undefined        && { title: title.trim() }),
      ...(metricType !== undefined   && { metricType }),
      ...(targetValue !== undefined  && { targetValue }),
      ...(currentValue !== undefined && { currentValue }),
      ...(unit !== undefined         && { unit }),
      ...(startDate !== undefined    && { startDate }),
      ...(dueDate !== undefined      && { dueDate }),
      updatedAt: new Date(),
    })
    .where(eq(keyResults.id, id))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(keyResults).where(eq(keyResults.id, id))
  return new NextResponse(null, { status: 204 })
}
