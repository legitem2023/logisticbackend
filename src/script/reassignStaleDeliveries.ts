import { PrismaClient, Prisma, User } from '@prisma/client';
import { getBestAvailableRider } from './getBestAvailableRider.js';

const prisma = new PrismaClient();
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || 'system-automation';
const MAX_RETRIES = 3;

// Explicit interface matching Prisma's generated type
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

interface RiderResult {
  id: string;
  name: string | null;
  image?: string | null;
  email?: string | null;
  phoneNumber?: string;
  passwordHash?: string | null;
  vehicleTypeId?: string | null;
  status?: string;
  rating?: number | null;
}

// Main function
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
        ]
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

    await processDeliveries(staleDeliveries);
    console.log('✅ Completed processing all stale deliveries');
  } catch (error) {
    console.error('❌ Error processing stale deliveries:', error);
    throw error;
  }
};

// Process deliveries in a transaction
async function processDeliveries(deliveries: DeliveryWithRider[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const delivery of deliveries) {
      await processDeliveryWithRetry(tx, delivery, MAX_RETRIES);
    }
  });
}

// Retry logic per delivery
async function processDeliveryWithRetry(
  tx: Prisma.TransactionClient,
  delivery: DeliveryWithRider,
  retriesLeft: number
): Promise<void> {
  try {
    const currentRiderId = delivery.assignedRiderId;
    
    if (currentRiderId) {
      await tx.user.update({
        where: { id: currentRiderId },
        data: { status: 'AVAILABLE' },
      });
    }

    const newRider: RiderResult | null = await getBestAvailableRider(delivery.id);
    const newRiderId = newRider?.id || null;
    const newStatus = newRiderId ? 'assigned' : 'unassigned';

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
  } catch (error) {
    if (retriesLeft > 0) {
      console.warn(`Retrying delivery ${delivery.id} (${retriesLeft} retries left)`);
      await processDeliveryWithRetry(tx, delivery, retriesLeft - 1);
    } else {
      console.error(`❌ Failed to process delivery ${delivery.id} after ${MAX_RETRIES} attempts`);
      throw error;
    }
  }
}

// Remarks generator
function generateRemarks(delivery: DeliveryWithRider, newRider: { id: string; name: string | null } | null): string {
  const currentRiderName = delivery.assignedRider?.name || 'unknown';
  const newRiderName = newRider?.name || 'none';
  
  return delivery.assignedRiderId
    ? `Auto-reassigned from ${currentRiderName} to ${newRiderName}`
    : `Auto-assigned to ${newRiderName}`;
}
