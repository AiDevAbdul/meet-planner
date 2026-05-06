import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { documents, projects, projectMembers, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { DocumentsClient } from './DocumentsClient'

export const dynamic = 'force-dynamic'

export default async function ProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, id))

  if (!project) notFound()

  const [membership] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, id))

  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))

  const projectDocs = await db
    .select({
      id:          documents.id,
      projectId:   documents.projectId,
      title:       documents.title,
      contentJson: documents.contentJson,
      status:      documents.status,
      createdBy:   documents.createdBy,
      updatedBy:   documents.updatedBy,
      updatedAt:   documents.updatedAt,
      createdAt:   documents.createdAt,
      creatorName: users.name,
    })
    .from(documents)
    .leftJoin(users, eq(documents.createdBy, users.id))
    .where(eq(documents.projectId, id))
    .orderBy(desc(documents.updatedAt))

  const effectiveRole = membership?.role ?? currentUser?.role ?? 'member'

  const serializedDocs = projectDocs.map(d => ({
    ...d,
    updatedAt: d.updatedAt.toISOString(),
    createdAt: d.createdAt.toISOString(),
  }))

  return (
    <div className="flex flex-col h-full">
      <div className="glass-topbar px-6 py-4" style={{ minHeight: 56 }}>
        <div className="flex items-center gap-2">
          <a
            href={`/projects/${id}`}
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {project.name}
          </a>
          <span style={{ color: 'var(--text-tertiary)' }}>/</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Documents
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <DocumentsClient
          projectId={id}
          initialDocs={serializedDocs}
          currentUserRole={effectiveRole}
        />
      </div>
    </div>
  )
}
