/*import { PrismaClient, Prisma } from '@prisma/client';
import { autoAssignRider } from './riderAssignment.js';

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
*/
import { PrismaClient } from '@prisma/client';
import { autoAssignRider } from './riderAssignment.js';

const prisma = new PrismaClient();
const SYSTEM_USER_ID = 'system-automation'; // Should be configured in your env

interface DeliveryWithRider {
  id: string;
  assignedRiderId: string | null;
  assignedRider: {
    id: string;
    name: string | null;
  } | null;
  deliveryStatus: string;
  updatedAt: Date;
  createdAt: Date;
}

export const reassignStaleDeliveries = async (): Promise<void> => {
  const STALE_DURATION_MINUTES = 5;
  const staleThreshold = new Date(Date.now() - STALE_DURATION_MINUTES * 60 * 1000);

  try {
    // Find stale deliveries in a single query
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
      },
    });

    if (staleDeliveries.length === 0) {
      console.log('No stale deliveries found');
      return;
    }

    console.log(`Found ${staleDeliveries.length} stale deliveries to process`);

    // Process deliveries in transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (const delivery of staleDeliveries) {
        const currentRiderId = delivery.assignedRiderId;
        
        // 1. Release current rider if exists
        if (currentRiderId) {
          await tx.user.update({
            where: { id: currentRiderId },
            data: { status: 'AVAILABLE' },
          });
        }

        // 2. Find new rider (implement your actual logic here)
        const newRider = await autoAssignRider(delivery.id);
        const newRiderId = newRider?.id || null;
        const newStatus = newRiderId ? 'assigned' : 'unassigned';

        // 3. Update delivery with new assignment
        await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            assignedRiderId: newRiderId,
            deliveryStatus: newStatus,
            updatedAt: new Date(),
            statusLogs: {
              create: {
                status: newStatus,
                updatedById: newRiderId || SYSTEM_USER_ID,
                timestamp: new Date(),
                remarks: generateRemarks(delivery, newRider),
              },
            },
          },
        });

        console.log(`Processed delivery ${delivery.id}. New rider: ${newRider?.name || 'None'}`);
      }
    });

    console.log('✅ Completed processing all stale deliveries');
  } catch (error) {
    console.error('❌ Error processing stale deliveries:', error);
    throw error; // Rethrow for proper error handling upstream
  }
};


function generateRemarks(delivery: DeliveryWithRider, newRider: { id: string; name: string | null } | null) {
  const currentRiderName = delivery.assignedRider?.name || 'unknown';
  const newRiderName = newRider?.name || 'none';
  
  return delivery.assignedRiderId
    ? `Auto-reassigned from ${currentRiderName} to ${newRiderName}`
    : `Auto-assigned to ${newRiderName}`;
  }
