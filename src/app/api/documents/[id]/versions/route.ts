import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documentVersions, documents, users } from '@/lib/db/schema'
import { eq, desc, count } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const versions = await db
    .select({
      id:            documentVersions.id,
      documentId:    documentVersions.documentId,
      versionNumber: documentVersions.versionNumber,
      contentJson:   documentVersions.contentJson,
      savedBy:       documentVersions.savedBy,
      savedAt:       documentVersions.savedAt,
      saverName:     users.name,
    })
    .from(documentVersions)
    .leftJoin(users, eq(documentVersions.savedBy, users.id))
    .where(eq(documentVersions.documentId, id))
    .orderBy(desc(documentVersions.versionNumber))

  return NextResponse.json({ data: versions })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [doc] = await db
    .select({ contentJson: documents.contentJson })
    .from(documents)
    .where(eq(documents.id, id))

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const contentToSave = ('contentJson' in body ? body.contentJson : doc.contentJson) as Record<string, unknown> | null

  const [{ currentMax }] = await db
    .select({ currentMax: count(documentVersions.id) })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, id))

  const [version] = await db
    .insert(documentVersions)
    .values({
      documentId:    id,
      versionNumber: (currentMax ?? 0) + 1,
      contentJson:   contentToSave,
      savedBy:       session.user.id,
    })
    .returning()

  return NextResponse.json({ data: version }, { status: 201 })
}
