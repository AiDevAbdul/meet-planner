import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { githubConnections } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')

  if (!code || !state) return NextResponse.redirect('/settings?github=error')

  let userId: string
  try { userId = Buffer.from(state, 'base64url').toString() }
  catch { return NextResponse.redirect('/settings?github=error') }

  // Exchange code for token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) return NextResponse.redirect('/settings?github=error')

  // Get user info
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'MeetPlanner' },
  })
  const ghUser = await userRes.json()

  // Upsert connection
  const existing = await db
    .select({ id: githubConnections.id })
    .from(githubConnections)
    .where(eq(githubConnections.userId, userId))
    .limit(1)

  if (existing.length > 0) {
    await db.update(githubConnections)
      .set({ login: ghUser.login, avatarUrl: ghUser.avatar_url, accessToken: tokenData.access_token, updatedAt: new Date() })
      .where(eq(githubConnections.id, existing[0].id))
  } else {
    await db.insert(githubConnections).values({
      userId,
      login:       ghUser.login,
      avatarUrl:   ghUser.avatar_url,
      accessToken: tokenData.access_token,
    })
  }

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?github=connected`)
}
