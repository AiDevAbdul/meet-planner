import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { intakeForms, intakeSubmissions, notifications, projectMembers } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { sendEmail } from '@/lib/google/gmail'

// Public endpoint — no auth required
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json()

  // Honeypot: bots fill hidden field named "_trap"
  if (body._trap) {
    return NextResponse.json({ ok: true }) // silently accept
  }

  const [form] = await db
    .select()
    .from(intakeForms)
    .where(and(eq(intakeForms.slug, slug), eq(intakeForms.active, true)))
    .limit(1)

  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

  // Validate required fields
  const fields = form.fields as Array<{
    id: string; type: string; label: string; required?: boolean
  }>

  const data: Record<string, string> = body.data ?? {}

  for (const field of fields) {
    if (field.required && !data[field.id]?.toString().trim()) {
      return NextResponse.json(
        { error: `Field "${field.label}" is required` },
        { status: 400 }
      )
    }
  }

  const submitterEmail = body.submitterEmail?.trim() || null
  const submitterName  = body.submitterName?.trim()  || null

  const [submission] = await db.insert(intakeSubmissions).values({
    formId:        form.id,
    projectId:     form.projectId,
    data,
    submitterEmail,
    submitterName,
  }).returning()

  // Increment submission counter
  await db
    .update(intakeForms)
    .set({ submissionCount: sql`${intakeForms.submissionCount} + 1` })
    .where(eq(intakeForms.id, form.id))

  // Notify project owners/managers
  const managers = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(
      eq(projectMembers.projectId, form.projectId),
    ))

  if (managers.length) {
    await db.insert(notifications).values(
      managers.map(m => ({
        userId:  m.userId,
        type:    'intake_form_submitted' as const,
        payload: {
          formId:        form.id,
          formName:      form.name,
          submissionId:  submission.id,
          submitterName:  submitterName  ?? '',
          submitterEmail: submitterEmail ?? '',
        } as Record<string, string>,
      }))
    )
  }

  // Send confirmation email to submitter
  if (submitterEmail) {
    try {
      await sendEmail({
        to:      [submitterEmail],
        subject: `We received your request — ${form.name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
            <h2 style="margin:0 0 8px;font-size:20px">Thanks${submitterName ? `, ${submitterName}` : ''}!</h2>
            <p style="margin:0 0 16px;color:#555">
              We received your submission for <strong>${form.name}</strong>.
              Our team will review it and get back to you.
            </p>
            <p style="margin:0;color:#999;font-size:12px">
              You can reply to this email if you have questions.
            </p>
          </div>
        `,
      })
    } catch {
      // Non-fatal: submission is saved even if email fails
    }
  }

  return NextResponse.json({ ok: true, submissionId: submission.id }, { status: 201 })
}
