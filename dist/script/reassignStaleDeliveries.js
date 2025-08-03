import { PrismaClient } from '@prisma/client';
import { getBestAvailableRider } from './getBestAvailableRider.js';
const prisma = new PrismaClient();
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || 'system-automation';
const MAX_RETRIES = 3;
// Main function
export const reassignStaleDeliveries = async () => {
    const STALE_DURATION_MINUTES = 5;
    const staleThreshold = new Date(Date.now() - STALE_DURATION_MINUTES * 60 * 1000);
    try {
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
    }
    catch (error) {
        console.error('❌ Error processing stale deliveries:', error);
        throw error;
    }
};
// Process deliveries in a transaction
async function processDeliveries(deliveries) {
    await prisma.$transaction(async (tx) => {
        for (const delivery of deliveries) {
            await processDeliveryWithRetry(tx, delivery, MAX_RETRIES);
        }
    });
}
// Retry logic per delivery
async function processDeliveryWithRetry(tx, delivery, retriesLeft) {
    try {
        const currentRiderId = delivery.assignedRiderId;
        if (currentRiderId) {
            await tx.user.update({
                where: { id: currentRiderId },
                data: { status: 'AVAILABLE' },
            });
        }
        const newRider = await getBestAvailableRider(delivery.id);
        const newRiderId = (newRider === null || newRider === void 0 ? void 0 : newRider.id) || null;
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
        console.log(`Processed delivery ${delivery.id}. New rider: ${(newRider === null || newRider === void 0 ? void 0 : newRider.name) || 'None'}`);
    }
    catch (error) {
        if (retriesLeft > 0) {
            console.warn(`Retrying delivery ${delivery.id} (${retriesLeft} retries left)`);
            await processDeliveryWithRetry(tx, delivery, retriesLeft - 1);
        }
        else {
            console.error(`❌ Failed to process delivery ${delivery.id} after ${MAX_RETRIES} attempts. Marking as failed.`);
            await tx.delivery.update({
                where: { id: delivery.id },
                data: {
                    deliveryStatus: 'failed',
                    updatedAt: new Date(),
                    statusLogs: {
                        create: {
                            status: 'failed',
                            updatedById: '686ffdf59a1ad0a2e9c79f0b',
                            timestamp: new Date(),
                            remarks: 'Automatically marked as failed after multiple reassignment attempts',
                        },
                    },
                },
            });
        }
    }
}
// Remarks generator
function generateRemarks(delivery, newRider) {
    var _a;
    const currentRiderName = ((_a = delivery.assignedRider) === null || _a === void 0 ? void 0 : _a.name) || 'unknown';
    const newRiderName = (newRider === null || newRider === void 0 ? void 0 : newRider.name) || 'none';
    return delivery.assignedRiderId
        ? `Auto-reassigned from ${currentRiderName} to ${newRiderName}`
        : `Auto-assigned to ${newRiderName}`;
}
