import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userSkills } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const rows = await db
    .select({ skill: userSkills.skill })
    .from(userSkills)
    .where(eq(userSkills.userId, userId))

  return NextResponse.json({ data: rows.map(r => r.skill) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, skill } = await req.json()

  if (!userId || !skill) {
    return NextResponse.json({ error: 'userId and skill are required' }, { status: 400 })
  }

  await db
    .insert(userSkills)
    .values({ userId, skill: skill.trim() })
    .onConflictDoNothing()

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, skill } = await req.json()

  if (!userId || !skill) {
    return NextResponse.json({ error: 'userId and skill are required' }, { status: 400 })
  }

  await db
    .delete(userSkills)
    .where(and(eq(userSkills.userId, userId), eq(userSkills.skill, skill)))

  return NextResponse.json({ success: true })
}
