import { PrismaClient, Prisma } from '@prisma/client';
//import { autoAssignRider } from './riderAssignment.js';

const prisma = new PrismaClient();

// Optional interface if needed for type-safe usage elsewhere
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
      // Be explicit about what package fields you need
      select: {
        id: true,
        packageType: true,
        // Add other needed fields
      }
    },
  },
});

  for (const delivery of staleDeliveries) {
    try {
      // For deliveries with assigned riders, release them first
      if (delivery.assignedRiderId) {
        await prisma.user.update({
          where: { id: delivery.assignedRiderId },
          data: { status: 'AVAILABLE' },
        });
      }

      // Auto-assign a new rider (you might want to modify autoAssignRider to handle this)
      //const newRider = await autoAssignRider(delivery);

      // Update the delivery with the new rider
      const [updatedDelivery] = await prisma.$transaction([
        prisma.delivery.update({
          where: { id: delivery.id },
          data: {
            assignedRiderId: delivery.assignedRiderId,
            deliveryStatus: 'assigned',
          },
          include: {
            assignedRider: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
      ]);

      // Log the reassignment or assignment
      await prisma.deliveryStatusLog.create({
        data: {
          deliveryId: delivery.id,
          status: delivery.assignedRiderId ? 'reassigned' : 'assigned',
          updatedById: updatedDelivery.assignedRiderId!,
          remarks: delivery.assignedRiderId 
            ? `Auto-reassigned from ${delivery.assignedRider?.name ?? 'unknown'} to ${newRider.name}`
            : `Auto-assigned to ${newRider.name}`,
        },
      });

    } catch (error) {
      console.error(`❌ Failed to process delivery ${delivery.id}:`, error);
    }
  }
};
