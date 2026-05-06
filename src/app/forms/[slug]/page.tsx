import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { intakeForms } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { FormPageClient } from './FormPageClient'

export const dynamic = 'force-dynamic'

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const [form] = await db
    .select({
      id:          intakeForms.id,
      name:        intakeForms.name,
      slug:        intakeForms.slug,
      description: intakeForms.description,
      fields:      intakeForms.fields,
    })
    .from(intakeForms)
    .where(and(eq(intakeForms.slug, slug), eq(intakeForms.active, true)))
    .limit(1)

  if (!form) notFound()

  return <FormPageClient form={form as Parameters<typeof FormPageClient>[0]['form']} />
}
