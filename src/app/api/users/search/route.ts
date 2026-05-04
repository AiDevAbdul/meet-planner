import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { ilike, or } from 'drizzle-orm'

// GET /api/users/search?q=<query>
// Returns users matching name or email (for DM user picker)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json([])

  const rows = await db
    .select({
      id:        users.id,
      name:      users.name,
      email:     users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)))
    .limit(10)

  return NextResponse.json(rows)
}
