import { PrismaClient } from '@prisma/client';
import { autoAssignRider } from './riderAssignment.js';

const prisma = new PrismaClient();

interface UpdatedDelivery {
  id: string;
  trackingNumber: string;
  assignedRiderId: string | null;
  assignedRider: {
    id: string;
    name: string | null;
    // Include all other User fields you need
  } | null;
}

export const reassignStaleDeliveries = async (): Promise<void> => {
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);

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

  for (const delivery of staleDeliveries) {
    try {
      if (!delivery.assignedRiderId) continue;

      // Release original rider
      await prisma.user.update({
        where: { id: delivery.assignedRiderId },
        data: { status: 'AVAILABLE' }
      });

      // Reassign new rider with proper type assertion
      const result = await prisma.$transaction([
        prisma.delivery.update({
          where: { id: delivery.id },
          data: { 
            assignedRiderId: delivery.assignedRiderId,
            status: 'assigned'
          },
          include: { assignedRider: true }
        }),
        // Other operations if needed
      ]);

      const updatedDelivery = result[0] as UpdatedDelivery;

      // Log the reassignment
      await prisma.deliveryStatusLog.create({
        data: {
          deliveryId: delivery.id,
          status: 'reassigned',
          updatedById: updatedDelivery.assignedRiderId!,
          remarks: `Auto-reassigned from ${delivery.assignedRider?.name}`
        }
      });

    } catch (error) {
      console.error(`Failed to reassign delivery ${delivery.id}:`, error);
    }
  }
};
