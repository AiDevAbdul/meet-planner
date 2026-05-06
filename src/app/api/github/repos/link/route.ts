import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { githubConnections, projectRepos } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

// POST — link a repo to a project
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, repoFullName } = await req.json()
  if (!projectId || !repoFullName) return NextResponse.json({ error: 'projectId and repoFullName required' }, { status: 400 })

  const [conn] = await db
    .select({ id: githubConnections.id })
    .from(githubConnections)
    .where(eq(githubConnections.userId, session.user.id))
    .limit(1)

  if (!conn) return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })

  // Avoid duplicates
  const existing = await db
    .select({ id: projectRepos.id })
    .from(projectRepos)
    .where(and(eq(projectRepos.projectId, projectId), eq(projectRepos.repoFullName, repoFullName)))
    .limit(1)

  if (existing.length > 0) return NextResponse.json({ alreadyLinked: true })

  const [repo] = await db
    .insert(projectRepos)
    .values({ projectId, connectionId: conn.id, repoFullName })
    .returning()

  return NextResponse.json(repo, { status: 201 })
}

// GET — list repos linked to a project
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json([])

  const repos = await db
    .select({ id: projectRepos.id, repoFullName: projectRepos.repoFullName, createdAt: projectRepos.createdAt })
    .from(projectRepos)
    .where(eq(projectRepos.projectId, projectId))

  return NextResponse.json(repos)
}

// DELETE — unlink a repo
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { repoId } = await req.json()
  await db.delete(projectRepos).where(eq(projectRepos.id, repoId))
  return NextResponse.json({ ok: true })
}
