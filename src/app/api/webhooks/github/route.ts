import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { db } from '@/lib/db'
import { tasks, projectRepos, githubConnections } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'

const TASK_ID_PATTERN = /[Cc]loses?:?\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g

export async function POST(req: NextRequest) {
  const event = req.headers.get('x-github-event')
  if (!event) return NextResponse.json({ ok: true })

  const rawBody = await req.text()

  // Verify signature if secret is configured
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (secret) {
    const sig = req.headers.get('x-hub-signature-256')
    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
    if (sig !== expected) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)

  // Only handle merged PRs
  if (event !== 'pull_request' || payload.action !== 'closed' || !payload.pull_request?.merged) {
    return NextResponse.json({ ok: true })
  }

  const repoFullName: string = payload.repository?.full_name
  const prBody: string       = payload.pull_request?.body ?? ''
  const prTitle: string      = payload.pull_request?.title ?? ''

  // Extract task UUIDs from PR title + body
  const text    = `${prTitle}\n${prBody}`
  const matches = [...text.matchAll(TASK_ID_PATTERN)].map(m => m[1])
  if (matches.length === 0) return NextResponse.json({ ok: true, tasksFound: 0 })

  // Verify this repo is linked to a project
  const linked = await db
    .select({ projectId: projectRepos.projectId })
    .from(projectRepos)
    .leftJoin(githubConnections, eq(projectRepos.connectionId, githubConnections.id))
    .where(eq(projectRepos.repoFullName, repoFullName))
    .limit(1)

  if (linked.length === 0) return NextResponse.json({ ok: true, tasksFound: 0 })

  // Close matched tasks
  const updated = await db
    .update(tasks)
    .set({ status: 'done', updatedAt: new Date() })
    .where(inArray(tasks.id, matches))
    .returning({ id: tasks.id })

  return NextResponse.json({ ok: true, tasksClosed: updated.length })
}
