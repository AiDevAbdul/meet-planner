import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? 'duckercreative.com'
const MIN_PW_LEN = 8

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }

    const normalised = email.toLowerCase().trim()

    if (!normalised.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return NextResponse.json(
        { error: `Only @${ALLOWED_DOMAIN} accounts are allowed` },
        { status: 403 },
      )
    }

    if (password.length < MIN_PW_LEN) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PW_LEN} characters` },
        { status: 400 },
      )
    }

    const existing = await db.query.users.findFirst({ where: eq(users.email, normalised) })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const [user] = await db
      .insert(users)
      .values({ name: name.trim(), email: normalised, passwordHash, role: 'member' })
      .returning({ id: users.id })

    return NextResponse.json({ success: true, id: user.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
