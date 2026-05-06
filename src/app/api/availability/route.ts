import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userAvailability } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const userId = searchParams.get('userId')
  const month  = searchParams.get('month') // format: YYYY-MM

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const conditions = [eq(userAvailability.userId, userId)]

  if (month) {
    conditions.push(sql`to_char(${userAvailability.date}::date, 'YYYY-MM') = ${month}`)
  }

  const rows = await db
    .select()
    .from(userAvailability)
    .where(and(...conditions))
    .orderBy(userAvailability.date)

  return NextResponse.json({ data: rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { userId, date, type, hoursAvailable, note } = body

  if (!userId || !date || !type) {
    return NextResponse.json({ error: 'userId, date, and type are required' }, { status: 400 })
  }

  const [created] = await db
    .insert(userAvailability)
    .values({
      userId,
      date,
      type,
      hoursAvailable: hoursAvailable ?? 0,
      note: note ?? null,
    })
    .returning()

  return NextResponse.json({ data: created }, { status: 201 })
}
