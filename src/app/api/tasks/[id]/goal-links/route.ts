import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { goalTaskLinks, goals, keyResults } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: taskId } = await params

  const links = await db
    .select({
      goalId:      goalTaskLinks.goalId,
      goalTitle:   goals.title,
      keyResultId: goalTaskLinks.keyResultId,
      krTitle:     keyResults.title,
    })
    .from(goalTaskLinks)
    .leftJoin(goals,      (t) => eq(goalTaskLinks.goalId,      goals.id))
    .leftJoin(keyResults, (t) => eq(goalTaskLinks.keyResultId, keyResults.id))
    .where(eq(goalTaskLinks.taskId, taskId))

  return NextResponse.json(links)
}
