import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  clientPortals, portalUpdates, portalDocApprovals,
  projects, documents, milestones, tasks,
} from '@/lib/db/schema'
import { eq, and, desc, count, sql } from 'drizzle-orm'
import { compare } from 'bcryptjs'

// Public endpoint — no auth. Increment view count and return portal data.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const [portal] = await db
    .select()
    .from(clientPortals)
    .where(and(eq(clientPortals.slug, slug), eq(clientPortals.active, true)))
    .limit(1)

  if (!portal) return NextResponse.json({ error: 'Portal not found' }, { status: 404 })

  const password = req.headers.get('x-portal-password')
  if (portal.passwordHash) {
    if (!password) return NextResponse.json({ protected: true }, { status: 401 })
    const valid = await compare(password, portal.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 403 })
  }

  // Increment view count (fire-and-forget)
  db.update(clientPortals)
    .set({ viewCount: sql`${clientPortals.viewCount} + 1` })
    .where(eq(clientPortals.id, portal.id))
    .catch(() => {})

  // Project info
  const [project] = await db
    .select({ id: projects.id, name: projects.name, status: projects.status, description: projects.description, color: projects.color, startDate: projects.startDate, endDate: projects.endDate })
    .from(projects)
    .where(eq(projects.id, portal.projectId))
    .limit(1)

  // Task stats
  const [stats] = await db
    .select({ total: count(), done: count(sql`CASE WHEN ${tasks.status} = 'done' THEN 1 END`) })
    .from(tasks)
    .where(eq(tasks.projectId, portal.projectId))

  // Milestones for this project
  const milestoneList = await db
    .select({ id: milestones.id, title: milestones.title, dueDate: milestones.dueDate, status: milestones.status })
    .from(milestones)
    .leftJoin(tasks, eq(milestones.taskId, tasks.id))
    .where(eq(tasks.projectId, portal.projectId))
    .orderBy(milestones.dueDate)
    .limit(20)

  // Approved documents
  const approvedDocs = await db
    .select({ id: documents.id, title: documents.title, updatedAt: documents.updatedAt })
    .from(documents)
    .where(and(eq(documents.projectId, portal.projectId), eq(documents.status, 'approved')))
    .orderBy(desc(documents.updatedAt))
    .limit(20)

  // Portal updates
  const updates = await db
    .select({ id: portalUpdates.id, content: portalUpdates.content, createdAt: portalUpdates.createdAt })
    .from(portalUpdates)
    .where(eq(portalUpdates.portalId, portal.id))
    .orderBy(desc(portalUpdates.createdAt))
    .limit(20)

  // Doc approvals
  const docApprovals = await db
    .select({ documentId: portalDocApprovals.documentId, status: portalDocApprovals.status, note: portalDocApprovals.note })
    .from(portalDocApprovals)
    .where(eq(portalDocApprovals.portalId, portal.id))

  return NextResponse.json({
    portal: {
      id:           portal.id,
      name:         portal.name,
      slug:         portal.slug,
      logoUrl:      portal.logoUrl,
      primaryColor: portal.primaryColor,
    },
    project,
    stats,
    milestones: milestoneList,
    documents:  approvedDocs,
    updates,
    docApprovals,
  })
}
