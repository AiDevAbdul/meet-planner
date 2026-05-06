import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documents, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const rows = await db
    .select({
      id:          documents.id,
      projectId:   documents.projectId,
      title:       documents.title,
      status:      documents.status,
      createdBy:   documents.createdBy,
      updatedBy:   documents.updatedBy,
      updatedAt:   documents.updatedAt,
      createdAt:   documents.createdAt,
      creatorName: users.name,
    })
    .from(documents)
    .leftJoin(users, eq(documents.createdBy, users.id))
    .where(eq(documents.projectId, id))
    .orderBy(desc(documents.updatedAt))

  return NextResponse.json({ data: rows })
}
