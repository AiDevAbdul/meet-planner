import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { webhookDeliveries } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const deliveries = await db
    .select({
      id:          webhookDeliveries.id,
      event:       webhookDeliveries.event,
      statusCode:  webhookDeliveries.statusCode,
      success:     webhookDeliveries.success,
      deliveredAt: webhookDeliveries.deliveredAt,
      responseBody: webhookDeliveries.responseBody,
    })
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, id))
    .orderBy(desc(webhookDeliveries.deliveredAt))
    .limit(50)

  return NextResponse.json(deliveries)
}
