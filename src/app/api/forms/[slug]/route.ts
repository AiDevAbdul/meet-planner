import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { intakeForms } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

// Public endpoint — no auth required
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const [form] = await db
    .select({
      id:          intakeForms.id,
      name:        intakeForms.name,
      description: intakeForms.description,
      fields:      intakeForms.fields,
    })
    .from(intakeForms)
    .where(and(eq(intakeForms.slug, slug), eq(intakeForms.active, true)))
    .limit(1)

  if (!form) return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 })

  return NextResponse.json(form)
}
