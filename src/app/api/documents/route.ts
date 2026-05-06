import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documents, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')

  const query = db
    .select({
      id:        documents.id,
      projectId: documents.projectId,
      title:     documents.title,
      status:    documents.status,
      createdBy: documents.createdBy,
      updatedBy: documents.updatedBy,
      updatedAt: documents.updatedAt,
      createdAt: documents.createdAt,
      creatorName: users.name,
    })
    .from(documents)
    .leftJoin(users, eq(documents.createdBy, users.id))
    .orderBy(desc(documents.updatedAt))

  const rows = projectId
    ? await query.where(eq(documents.projectId, projectId))
    : await query

  return NextResponse.json({ data: rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { projectId, title } = body as { projectId?: string; title?: string }

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const [doc] = await db
    .insert(documents)
    .values({
      projectId:   projectId ?? null,
      title:       title.trim(),
      contentJson: null,
      status:      'draft',
      createdBy:   session.user.id,
      updatedBy:   session.user.id,
    })
    .returning()

  return NextResponse.json({ data: doc }, { status: 201 })
}
