import { PrismaClient } from '@prisma/client';
import { autoAssignRider } from './riderAssignment.js';

const prisma = new PrismaClient();

export async function reassignStaleDeliveries() {
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  // 1. Find stale assigned deliveries
  const staleDeliveries = await prisma.delivery.findMany({
    where: {
      deliveryStatus: 'assigned',
      updatedAt: { lt: staleThreshold },
      assignedRiderId: { not: null }
    },
    include: {
      assignedRider: true,
      packages: true
    }
  });

  // 2. Process each stale delivery
  for (const delivery of staleDeliveries) {
    try {
      // 2a. Release original rider
      await prisma.user.update({
        where: { id: delivery.assignedRiderId! },
        data: { status: 'AVAILABLE' }
      });

      // 2b. Reassign new rider
      const updatedDelivery = await autoAssignRider(delivery.id);

      // 2c. Log the reassignment
      await prisma.deliveryStatusLog.create({
        data: {
          deliveryId: delivery.id,
          status: 'reassigned',
          updatedById: updatedDelivery.assignedRiderId!,
          remarks: `Auto-reassigned from ${delivery.assignedRider?.name}`
        }
      });

      console.log(`Reassigned delivery ${delivery.trackingNumber}`);
    } catch (error) {
      console.error(`Failed to reassign delivery ${delivery.id}:`, error);
    }
  }
}
