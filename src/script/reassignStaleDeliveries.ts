import { PrismaClient } from '@prisma/client';
import { autoAssignRider } from './riderAssignment.js'; // ✅ Now actually used

const prisma = new PrismaClient();

export const reassignStaleDeliveries = async (): Promise<void> => {
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  const staleDeliveries = await prisma.delivery.findMany({
    where: {
      deliveryStatus: { in: ['assigned', 'unassigned'] },
      updatedAt: { lt: staleThreshold },
    },
    include: {
      assignedRider: true,
      packages: true,
    },
  });

  for (const delivery of staleDeliveries) {
    try {
      const prevRiderId = delivery.assignedRiderId;

      // ✅ Release previous rider if one exists
      if (prevRiderId) {
        await prisma.user.update({
          where: { id: prevRiderId },
          data: { status: 'AVAILABLE' },
        });
      }

      // ✅ Use autoAssignRider to assign a new one
      const newRiderId = await autoAssignRider(delivery.id);

      if (!newRiderId) {
        console.log(`⚠️ No available rider found for delivery ${delivery.id}`);
        continue;
      }
      // ✅ Log the reassignment
      await prisma.deliveryStatusLog.create({
        data: {
          deliveryId: delivery.id,
          status: 'reassigned',
          updatedById: newRiderId,
          remarks: prevRiderId
            ? `Auto-reassigned from ${delivery.assignedRider?.name ?? 'unknown'}`
            : `Auto-assigned due to unassigned status`,
        },
      });
    } catch (error) {
      console.error(`❌ Failed to reassign delivery ${delivery.id}:`, error);
    }
  }
};
