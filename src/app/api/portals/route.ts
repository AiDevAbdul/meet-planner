import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { clientPortals, projects, projectMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// GET /api/portals?projectId=xxx — list portals for a project
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const portals = await db
    .select({
      id:           clientPortals.id,
      name:         clientPortals.name,
      slug:         clientPortals.slug,
      primaryColor: clientPortals.primaryColor,
      logoUrl:      clientPortals.logoUrl,
      active:       clientPortals.active,
      viewCount:    clientPortals.viewCount,
      createdAt:    clientPortals.createdAt,
      updatedAt:    clientPortals.updatedAt,
    })
    .from(clientPortals)
    .where(eq(clientPortals.projectId, projectId))

  return NextResponse.json(portals)
}

// POST /api/portals — create a portal
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { projectId, name, slug, primaryColor, logoUrl, password } = body

  if (!projectId || !name || !slug) {
    return NextResponse.json({ error: 'projectId, name, and slug are required' }, { status: 400 })
  }

  const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  if (!slugClean) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })

  let passwordHash: string | null = null
  if (password) {
    const { hash } = await import('bcryptjs')
    passwordHash = await hash(password, 10)
  }

  try {
    const [portal] = await db
      .insert(clientPortals)
      .values({
        projectId,
        name,
        slug: slugClean,
        primaryColor: primaryColor ?? '#007AFF',
        logoUrl:      logoUrl ?? null,
        passwordHash,
        active: true,
      })
      .returning()

    return NextResponse.json(portal, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
  }
}
