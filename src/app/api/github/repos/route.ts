import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { githubConnections, projectRepos } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [conn] = await db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.userId, session.user.id))
    .limit(1)

  if (!conn) return NextResponse.json({ connected: false, repos: [] })

  const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator', {
    headers: { Authorization: `Bearer ${conn.accessToken}`, 'User-Agent': 'MeetPlanner' },
  })

  if (!res.ok) {
    if (res.status === 401) {
      await db.delete(githubConnections).where(eq(githubConnections.id, conn.id))
      return NextResponse.json({ connected: false, repos: [] })
    }
    return NextResponse.json({ error: 'GitHub API error' }, { status: 502 })
  }

  const ghRepos = await res.json()
  return NextResponse.json({
    connected: true,
    login:     conn.login,
    avatarUrl: conn.avatarUrl,
    repos:     ghRepos.map((r: { full_name: string; private: boolean; updated_at: string }) => ({
      fullName:  r.full_name,
      private:   r.private,
      updatedAt: r.updated_at,
    })),
  })
}

// DELETE — disconnect GitHub
export async function DELETE(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(githubConnections).where(eq(githubConnections.userId, session.user.id))
  return NextResponse.json({ ok: true })
}
