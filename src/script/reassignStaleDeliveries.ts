import { PrismaClient, Prisma } from '@prisma/client';
//import { autoAssignRider } from './riderAssignment.js';

const prisma = new PrismaClient();

interface UpdatedDelivery {
  id: string;
  trackingNumber: string;
  assignedRiderId: string | null;
  assignedRider: {
    id: string;
    name: string | null;
  } | null;
}

export const reassignStaleDeliveries = async (): Promise<void> => {
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  const staleDeliveries = await prisma.delivery.findMany({
    where: {
      OR: [
        {
          deliveryStatus: 'assigned',
          updatedAt: { lt: staleThreshold },
          assignedRiderId: { not: null },
        },
        {
          deliveryStatus: 'unassigned',
          createdAt: { lt: staleThreshold },
          assignedRiderId: null,
        }
      ]
    },
    include: {
      assignedRider: true,
      packages: {
        select: {
          id: true,
          packageType: true,
        }
      },
    },
  });

  console.log(staleDeliveries, "<<<");

  for (const delivery of staleDeliveries) {
    try {
      // For deliveries with assigned riders, release them first
      if (delivery.assignedRiderId) {
        await prisma.user.update({
          where: { id: delivery.assignedRiderId },
          data: { status: 'AVAILABLE' },
        });
      }

      // Auto-assign a new rider (uncomment and implement this)
      // const newRider = await autoAssignRider(delivery);
      // For now, we'll keep the same rider or set to null if you prefer
      const newRiderId = delivery.assignedRiderId; // Replace with newRider.id when implemented

      const updatedDelivery = await prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          assignedRiderId: newRiderId,
          deliveryStatus: 'assigned',
          updatedAt: new Date(),
          statusLogs: {
            create: {
              status: "assigned",
              updatedById: newRiderId,
              timestamp: new Date(),
              remarks: delivery.assignedRiderId 
                ? `Auto-reassigned from ${delivery.assignedRider?.name ?? 'unknown'} to ${newRiderId}`
                : `Auto-assigned to ${newRiderId}`
            },
          },
        },
        include: {
          assignedRider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      console.log(`✅ Successfully reassigned delivery ${delivery.id}`);

    } catch (error) {
      console.error(`❌ Failed to process delivery ${delivery.id}:`, error);
    }
  }
};
