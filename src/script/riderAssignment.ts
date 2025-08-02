import { PrismaClient, User, VehicleType } from '@prisma/client';
import { calculateHaversineDistance } from './geoUtils.js';

const prisma = new PrismaClient();
let dist;
interface ScoredRider extends User {
  score: number;
  canCarry: boolean;
  currentDeliveries: number;
  vehicleType?: VehicleType | null;
}

export const autoAssignRider = async (deliveryId: string) => {
  // 1. Get the delivery with pickup location
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { 
      packages: true,
      assignedRider: true 
    },
  });

  if (!delivery) throw new Error('Delivery not found');
  if (delivery.assignedRiderId) throw new Error('Delivery already assigned');

  // 2. Calculate total package weight/volume
  const totalWeight = delivery.packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);
  const totalVolume = delivery.packages.reduce((sum, pkg) => {
    const [l, w, h] = pkg.dimensions?.split('x').map(Number) || [0, 0, 0];
    return sum + (l * w * h);
  }, 0);

  // 3. Find eligible active riders (without include)
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
//console.log(eligibleRiders,'<-legit-');
  if (eligibleRiders.length === 0) {
    throw new Error('No active riders available');
  }

  // 4. Score and filter riders by proximity and capacity
  const scoredRiders: ScoredRider[] = [];
  for (const rider of eligibleRiders) {
    const distance = calculateHaversineDistance(
      [rider.currentLatitude!, rider.currentLongitude!],
      [delivery.pickupLatitude, delivery.pickupLongitude]
    );
    dist = distance;
    if (distance > 15) continue;
  // console.log(distance,'distance');
    const currentDeliveries = await prisma.delivery.count({
      where: { 
        assignedRiderId: rider.id,
        deliveryStatus: { in: ['assigned', 'picked_up'] }
      }
    });
 // console.log(currentDeliveries,'curdle');
    // Fetch vehicleType manually since Prisma MongoDB doesn't support include
    const vehicleType = rider.vehicleTypeId
      ? await prisma.vehicleType.findUnique({
          where: { id: rider.vehicleTypeId }
        })
      : null;
   
    const canCarry = vehicleType
      ? (totalWeight <= (vehicleType.maxCapacityKg || Infinity)) &&
        (totalVolume <= (vehicleType.maxVolumeM3 || Infinity))
      : false;

    const score =
      distance * 0.6 +
      currentDeliveries * 200 +
      (vehicleType?.perKmRate || 10) * 0.2 +
      (5 - (rider.rating || 3.5)) * 100;

    scoredRiders.push({
      ...rider,
      score,
      canCarry,
      currentDeliveries,
      vehicleType,
    });
  }

  // 5. Select best available rider
  const bestRider = scoredRiders
    .filter(r => r.canCarry)
    .sort((a, b) => a.score - b.score)[0];
  //console.log(temporal,'bestrider');
  
  if (!bestRider) {
    throw new Error('No suitable rider found within range');
  }
console.log(dist,'Distance');
  // 6. Assign rider and log status
  return await prisma.$transaction([
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        assignedRiderId: bestRider.id,
        deliveryStatus: 'assigned',
        updatedAt: new Date(),
        statusLogs: {
            create: {
              status: "assigned",
              updatedById: bestRider.id,
              timestamp: new Date(),
              remarks: `Auto-assigned to ${bestRider.name} (Score: ${bestRider.score.toFixed(1)})`
            },
          },
      },
      include: { assignedRider: true }
    }),
   
  ]);
};
