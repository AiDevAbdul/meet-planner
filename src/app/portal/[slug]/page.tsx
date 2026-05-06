import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { clientPortals } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { PortalPageClient } from './PortalPageClient'

export const dynamic = 'force-dynamic'

export default async function PublicPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const [portal] = await db
    .select({ id: clientPortals.id, slug: clientPortals.slug, passwordHash: clientPortals.passwordHash, name: clientPortals.name })
    .from(clientPortals)
    .where(and(eq(clientPortals.slug, slug), eq(clientPortals.active, true)))
    .limit(1)

  if (!portal) notFound()

  return <PortalPageClient slug={slug} isProtected={!!portal.passwordHash} />
}
