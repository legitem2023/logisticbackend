import { format } from 'date-fns'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function generateTrackingNumber(): Promise<string> {
  const today = new Date()
  const dateStr = format(today, 'yyyyMMdd')

  const trackingCounter = await prisma.trackingCounter.upsert({
    where: { date: new Date(dateStr) },
    update: { counter: { increment: 1 } },
    create: {
      date: new Date(dateStr),
      counter: 1
    }
  })

  const paddedCounter = trackingCounter.counter.toString().padStart(6, '0')

  return `TRK-${dateStr}-${paddedCounter}`
}
