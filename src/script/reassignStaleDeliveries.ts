import { PrismaClient, Prisma, User } from '@prisma/client';
import { getBestAvailableRider } from './getBestAvailableRider.js';

const prisma = new PrismaClient();
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || 'system-automation';
const MAX_RETRIES = 5; // Now matches the database field
const TRANSACTION_TIMEOUT = 30000;

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
  retriesCount: number; // Added retriesCount
}

interface RiderResult {
  id: string;
  name: string | null;
  // ... other fields
}

export const reassignStaleDeliveries = async (): Promise<void> => {
  const STALE_DURATION_MINUTES = 5;
  const staleThreshold = new Date(Date.now() - STALE_DURATION_MINUTES * 60 * 1000);

  try {
    const staleDeliveries: DeliveryWithRider[] = await prisma.delivery.findMany({
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
          },
          {
            deliveryStatus: 'Pending',
            createdAt: { lt: staleThreshold },
            assignedRiderId: null,  
          }
        ],
        retriesCount: { lt: MAX_RETRIES } // Only process deliveries with retries left
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

    if (staleDeliveries.length === 0) {
      console.log('No stale deliveries found');
      return;
    }

    await processDeliveries(staleDeliveries, staleThreshold);
    console.log('✅ Completed processing all stale deliveries');
  } catch (error) {
    console.error('❌ Error processing stale deliveries:', error);
    throw error;
  }
};

async function processDeliveries(deliveries: DeliveryWithRider[], staleThreshold: Date): Promise<void> {
  for (const delivery of deliveries) {
    try {
      await prisma.$transaction(async (tx) => {
        await processDelivery(tx, delivery, staleThreshold);
      }, { timeout: TRANSACTION_TIMEOUT });
    } catch (error) {
      console.error(`❌ Transaction failed for delivery ${delivery.id}:`, error);
    }
  }
}

async function processDelivery(
  tx: Prisma.TransactionClient,
  delivery: DeliveryWithRider,
  staleThreshold: Date
): Promise<void> {
  // Verify delivery is still stale and hasn't been updated
  const currentDelivery = await tx.delivery.findUnique({
    where: { id: delivery.id },
    include: { assignedRider: true },
  });

  if (!currentDelivery) return;

  if (currentDelivery.updatedAt > staleThreshold || 
      !['assigned', 'unassigned', 'Pending'].includes(currentDelivery.deliveryStatus)) {
    return;
  }

  const currentRetries = currentDelivery.retriesCount;
  const newRetriesCount = currentRetries + 1;

  try {
    if (currentDelivery.assignedRiderId) {
      await tx.user.update({
        where: { id: currentDelivery.assignedRiderId },
        data: { status: 'available' },
      });
    }

    const newRider = await getBestAvailableRider(currentDelivery.id);
    const newRiderId = newRider?.id || null;
    const newStatus = newRiderId ? 'assigned' : 'unassigned';

    await tx.delivery.update({
      where: { id: currentDelivery.id },
      data: {
        assignedRiderId: newRiderId,
        deliveryStatus: newStatus,
        retriesCount: 0, // Reset retries on successful reassignment
        updatedAt: new Date(),
        statusLogs: {
          create: {
            status: newStatus,
            updatedById: newRiderId || SYSTEM_USER_ID,
            timestamp: new Date(),
            remarks: generateRemarks(currentDelivery, newRider),
          },
        },
      },
    });

    console.log(`✅ Successfully reassigned delivery ${delivery.id}`);
  } catch (error) {
    if (newRetriesCount >= MAX_RETRIES) {
      await markDeliveryAsFailed(tx, currentDelivery.id);
    } else {
      await tx.delivery.update({
        where: { id: currentDelivery.id },
        data: { retriesCount: newRetriesCount },
      });
    }
    throw error; // Throw to trigger transaction rollback
  }
}

async function markDeliveryAsFailed(tx: Prisma.TransactionClient, deliveryId: string) {
  await tx.delivery.update({
    where: { id: deliveryId },
    data: {
      deliveryStatus: 'failed',
      updatedAt: new Date(),
      statusLogs: {
        create: {
          status: 'failed',
          updatedById: SYSTEM_USER_ID,
          timestamp: new Date(),
          remarks: 'Automatically marked as failed after maximum reassignment attempts',
        },
      },
    },
  });
}

function generateRemarks(delivery: DeliveryWithRider, newRider: RiderResult | null): string {
  const currentRiderName = delivery.assignedRider?.name || 'unknown';
  const newRiderName = newRider?.name || 'none';
  
  return delivery.assignedRiderId
    ? `Auto-reassigned from ${currentRiderName} to ${newRiderName}`
    : `Auto-assigned to ${newRiderName}`;
}
