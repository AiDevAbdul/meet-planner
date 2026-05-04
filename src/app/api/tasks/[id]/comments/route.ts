import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { taskComments, users } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const rows = await db
    .select({
      id:            taskComments.id,
      content:       taskComments.content,
      createdAt:     taskComments.createdAt,
      editedAt:      taskComments.editedAt,
      userId:        taskComments.userId,
      userName:      users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(taskComments)
    .leftJoin(users, eq(taskComments.userId, users.id))
    .where(eq(taskComments.taskId, id))
    .orderBy(asc(taskComments.createdAt))

  return NextResponse.json(rows)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { content } = await req.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const [comment] = await db
    .insert(taskComments)
    .values({
      taskId:  id,
      userId:  session.user.id,
      content: content.trim(),
    })
    .returning()

  const user = await db
    .select({ name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  return NextResponse.json({
    ...comment,
    userName:      user[0]?.name ?? 'Unknown',
    userAvatarUrl: user[0]?.avatarUrl ?? null,
  }, { status: 201 })
}
