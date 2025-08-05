import { PrismaClient, User, VehicleType } from '@prisma/client';
import { calculateHaversineDistance } from './geoUtils.js';
import { notifier } from './script.js';

const prisma = new PrismaClient();
let dist:any;
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
    if (!pkg.dimensions) return sum;

    const dims = pkg.dimensions.split('x').map(Number);
    const [l, w, h] = dims;

    if ([l, w, h].some(v => isNaN(v))) return sum; // skip invalid dimensions

    return sum + (l * w * h);
  }, 0);

  console.log(totalWeight, totalVolume);
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

    if (distance > 15) continue;

    const currentDeliveries = await prisma.delivery.count({
      where: { 
        assignedRiderId: rider.id,
        deliveryStatus: { in: ['assigned', 'picked_up', 'in_transit', 'en_route'] }
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
  console.log(scoredRiders,'<-scoredRiders-');
  // 5. Select best available rider
  const bestRider = scoredRiders
    .filter(r => r.canCarry)
    .sort((a, b) => a.score - b.score)[0];
  
  if (!bestRider) {
    throw new Error('No suitable rider found within range');
  }

  const note = async(bestRider:any)=>{
    const notification:any = {
        userId:bestRider.id,
        title: "You have been assigned a delivery",
        message: `You have been assigned a delivery`,
        type: "delivery"
      };
    await notifier(notification);
  }
  note(bestRider);
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

