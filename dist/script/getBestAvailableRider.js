import { PrismaClient } from '@prisma/client';
import { calculateHaversineDistance } from './geoUtils.js';
const prisma = new PrismaClient();
export const getBestAvailableRider = async (deliveryId) => {
    // 1. Get the delivery with pickup location
    const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: { packages: true }
    });
    if (!delivery)
        throw new Error('Delivery not found');
    // 2. Calculate total package weight/volume
    const totalWeight = delivery.packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);
    const totalVolume = delivery.packages.reduce((sum, pkg) => {
        var _a;
        const [l, w, h] = ((_a = pkg.dimensions) === null || _a === void 0 ? void 0 : _a.split('x').map(Number)) || [0, 0, 0];
        return sum + (l * w * h);
    }, 0);
    // 3. Find eligible riders
    const eligibleRiders = await prisma.user.findMany({
        where: {
            role: 'RIDER',
            status: 'AVAILABLE',
            lastUpdatedAt: {
                gte: new Date(Date.now() - 5 * 60 * 1000)
            },
            currentLatitude: { not: null },
            currentLongitude: { not: null },
        }
    });
    if (eligibleRiders.length === 0) {
        throw new Error('No active riders available');
    }
    // 4. Score and filter riders
    const scoredRiders = [];
    for (const rider of eligibleRiders) {
        const distance = calculateHaversineDistance([rider.currentLatitude, rider.currentLongitude], [delivery.pickupLatitude, delivery.pickupLongitude]);
        if (distance > 15)
            continue;
        const currentDeliveries = await prisma.delivery.count({
            where: {
                assignedRiderId: rider.id,
                deliveryStatus: { in: ['assigned', 'picked_up'] }
            }
        });
        const vehicleType = rider.vehicleTypeId
            ? await prisma.vehicleType.findUnique({
                where: { id: rider.vehicleTypeId }
            })
            : null;
        const canCarry = vehicleType
            ? (totalWeight <= (vehicleType.maxCapacityKg || Infinity)) &&
                (totalVolume <= (vehicleType.maxVolumeM3 || Infinity))
            : false;
        const score = distance * 0.6 +
            currentDeliveries * 200 +
            ((vehicleType === null || vehicleType === void 0 ? void 0 : vehicleType.perKmRate) || 10) * 0.2 +
            (5 - (rider.rating || 3.5)) * 100;
        scoredRiders.push(Object.assign(Object.assign({}, rider), { score,
            canCarry,
            currentDeliveries,
            vehicleType }));
    }
    // 5. Return best rider
    const bestRider = scoredRiders
        .filter(r => r.canCarry)
        .sort((a, b) => a.score - b.score)[0];
    if (!bestRider) {
        throw new Error('No suitable rider found within range');
    }
    return bestRider;
};
