import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projectExpenses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// DELETE /api/projects/[id]/expenses/[expenseId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { expenseId } = await params

  const [deleted] = await db
    .delete(projectExpenses)
    .where(eq(projectExpenses.id, expenseId))
    .returning()

  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
