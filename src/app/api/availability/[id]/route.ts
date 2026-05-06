import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userAvailability } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [deleted] = await db
    .delete(userAvailability)
    .where(eq(userAvailability.id, id))
    .returning({ id: userAvailability.id })

  if (!deleted) {
    return NextResponse.json({ error: 'Availability block not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
