import { PrismaClient, User, VehicleType } from '@prisma/client';
import { calculateHaversineDistance } from './geoUtils.js';
import { notifier } from './script.js';

const prisma = new PrismaClient();
let dist:any;
interface ScoredRider extends User {
  score: number;
  currentDeliveries: number;
  vehicleType?: VehicleType | null;
}

export const autoAssignRider = async (deliveryId: string) => {
  // 1. Get the delivery with pickup location (without packages since we dont need them)
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { 
      assignedRider: true 
    },
  });

  if (!delivery) throw new Error('Delivery not found');
  if (delivery.assignedRiderId) throw new Error('Delivery already assigned');

  // 3. Find eligible active riders
  const eligibleRiders = await prisma.user.findMany({
    where: {
      role: {
        in: ["RIDER", "Rider"]
      },
      status: {
        in: ["available","AVAILABLE"]
      },
      currentLatitude: { not: null },
      currentLongitude: { not: null },
    }
  });
  
  if (eligibleRiders.length === 0) {
    throw new Error('No active riders available');
  }

  // 4. Score riders by proximity
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

    const score =
      distance * 0.6 +
      currentDeliveries * 200 +
      (vehicleType?.perKmRate || 10) * 0.2 +
      (5 - (rider.rating || 3.5)) * 100;

    scoredRiders.push({
      ...rider,
      score,
      currentDeliveries,
      vehicleType,
    });
  }

  if (scoredRiders.length === 0) {
    throw new Error('No riders found within range');
  }

  // 5. Select best rider based on score
  const bestRider = scoredRiders.sort((a, b) => a.score - b.score)[0];

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
