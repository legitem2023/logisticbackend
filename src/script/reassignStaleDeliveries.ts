import { PrismaClient, Delivery, User, DeliveryStatusLog } from '@prisma/client';
import { autoAssignRider } from './riderAssignment.js';

const prisma = new PrismaClient();

// Define types for the Prisma queries
interface DeliveryWithRider extends Delivery {
  assignedRider: User | null;
  packages: Array<{
    id: string;
    packageType: string;
    weight: number | null;
    dimensions: string | null;
  }>;
}

interface UpdatedDelivery {
  id: string;
  trackingNumber: string;
  assignedRiderId: string | null;
  assignedRider: User | null;
}

export const reassignStaleDeliveries = async (): Promise<void> => {
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  // 1. Find stale assigned deliveries
  const staleDeliveries: DeliveryWithRider[] = await prisma.delivery.findMany({
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
      if (!delivery.assignedRiderId || !delivery.assignedRider) {
        console.warn(`Delivery ${delivery.id} has no assigned rider`);
        continue;
      }

      // 2a. Release original rider
      await prisma.user.update({
        where: { id: delivery.assignedRiderId },
        data: { status: 'AVAILABLE' }
      });

      // 2b. Reassign new rider
      const updatedDelivery: UpdatedDelivery = await autoAssignRider(delivery.id);

      if (!updatedDelivery.assignedRiderId) {
        throw new Error('Failed to assign new rider');
      }

      // 2c. Log the reassignment
      const statusLog: DeliveryStatusLog = await prisma.deliveryStatusLog.create({
        data: {
          deliveryId: delivery.id,
          status: 'reassigned',
          updatedById: updatedDelivery.assignedRiderId,
          remarks: `Auto-reassigned from ${delivery.assignedRider.name}`
        }
      });

      console.log(`Reassigned delivery ${delivery.trackingNumber} (Log ID: ${statusLog.id})`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Failed to reassign delivery ${delivery.id}:`, error.message);
      } else {
        console.error(`Failed to reassign delivery ${delivery.id}:`, error);
      }
    }
  }
};
