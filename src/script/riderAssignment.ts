/*import { PrismaClient, User, VehicleType, Delivery } from '@prisma/client';
import { calculateHaversineDistance } from './geoUtils.js';

const prisma = new PrismaClient();

interface ScoredRider extends User {
  score: number;
  canCarry: boolean; // Ensure this matches your usage
  currentDeliveries: number;
  vehicleType?: VehicleType | null; // Add if needed
}
export const autoAssignRider = async (deliveryId: string) => {
  // 1. Get the delivery with pickup location
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { packages: true },
  });

  if (!delivery) throw new Error('Delivery not found');
  if (delivery.assignedRiderId) throw new Error('Delivery already assigned');

  // 2. Calculate total package weight/volume
  const totalWeight = delivery.packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);
  const totalVolume = delivery.packages.reduce((sum, pkg) => {
    const [l, w, h] = pkg.dimensions?.split('x').map(Number) || [0, 0, 0];
    return sum + (l * w * h);
  }, 0);

  // 3. Find eligible riders within 15km radius (MongoDB geospatial query)
  const eligibleRiders = await prisma.user.findRaw({
    filter: {
      role: 'Rider',
      status: 'active',
      currentLatitude: { $exists: true },
      currentLongitude: { $exists: true },
      lastUpdatedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Active in last 5 mins
      $expr: {
        $lt: [
          {
            $sqrt: {
              $add: [
                { $pow: [{ $subtract: ['$currentLatitude', delivery.pickupLatitude] }, 2] },
                { $pow: [{ $subtract: ['$currentLongitude', delivery.pickupLongitude] }, 2] }
              ]
            }
          },
          0.15 // ~15km radius (adjust as needed)
        ]
      }
    }
  }) as unknown as User[];

  if (eligibleRiders.length === 0) {
    throw new Error('No active riders in proximity');
  }

  // 4. Score and sort riders
  const scoredRiders: ScoredRider[] = await Promise.all(
    eligibleRiders.map(async (rider) => {
      // Get rider's current deliveries to check capacity
      const currentDeliveries = await prisma.delivery.count({
        where: { 
          assignedRiderId: rider.id,
          deliveryStatus: { in: ['assigned', 'picked_up'] }
        }
      });

      // Get vehicle capacity
      const vehicle = rider.vehicleTypeId 
        ? await prisma.vehicleType.findUnique({ where: { id: rider.vehicleTypeId } })
        : null;

      // Check capacity constraints
      const canCarry = vehicle 
        ? (totalWeight <= (vehicle.maxCapacityKg || Infinity)) && 
          (totalVolume <= (vehicle.maxVolumeM3 || Infinity))
        : false;

      // Calculate base distance score
      const distance = calculateHaversineDistance(
        [rider.currentLatitude!, rider.currentLongitude!],
        [delivery.pickupLatitude, delivery.pickupLongitude]
      );

      // Score formula (customize weights as needed)
      const score = 
        distance * 0.6 + // Distance (60% weight)
        currentDeliveries * 200 + // Load balancing (each active delivery adds 200m penalty)
        (vehicle?.perKmRate || 10) * 0.2 + // Prefer cheaper vehicles
        (5 - (rider.rating || 3)) * 100; // Prefer higher ratings

      return { 
        ...rider, 
        score,
        canCarry,
        currentDeliveries,
        vehicleType: vehicle 
      };
    })
  );

  // 5. Filter and select best rider
  const bestRider = scoredRiders
    .filter(r => r.canCarry)
    .sort((a, b) => a.score - b.score)[0];

  if (!bestRider) {
    throw new Error('No rider with sufficient capacity');
  }

  // 6. Assign rider (transactionally)
  return await prisma.$transaction([
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        assignedRiderId: bestRider.id,
        deliveryStatus: 'assigned',
      },
      include: { assignedRider: true }
    }),
    prisma.deliveryStatusLog.create({
      data: {
        deliveryId,
        status: 'assigned',
        updatedById: bestRider.id,
        remarks: `Auto-assigned to ${bestRider.name}`
      }
    })
  ]);
}
*/
import { PrismaClient, User, VehicleType, Delivery } from '@prisma/client';
import { calculateHaversineDistance } from './geoUtils.js';

const prisma = new PrismaClient();

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

  // 3. Find eligible active riders
  const eligibleRiders = await prisma.user.findMany({
    where: {
      role: 'RIDER',
      status: 'active',
      currentLatitude: { not: null },
      currentLongitude: { not: null },
      lastUpdatedAt: { 
        gte: new Date(Date.now() - 5 * 60 * 1000) // Active in last 5 mins
      },
      // Additional proximity filter will be applied in code
    },
    include: {
      vehicleType: true
    }
  });

  if (eligibleRiders.length === 0) {
    throw new Error('No active riders available');
  }

  // 4. Score and filter riders by proximity (15km radius) and capacity
  const scoredRiders: ScoredRider[] = [];
  
  for (const rider of eligibleRiders) {
    if (!rider.currentLatitude || !rider.currentLongitude) continue;

    const distance = calculateHaversineDistance(
      [rider.currentLatitude, rider.currentLongitude],
      [delivery.pickupLatitude, delivery.pickupLongitude]
    );

    // Skip if beyond 15km radius
    if (distance > 15) continue; // 15km

    const currentDeliveries = await prisma.delivery.count({
      where: { 
        assignedRiderId: rider.id,
        deliveryStatus: { in: ['assigned', 'picked_up'] }
      }
    });

    const canCarry = rider.vehicleType 
      ? (totalWeight <= (rider.vehicleType.maxCapacityKg || Infinity)) && 
        (totalVolume <= (rider.vehicleType.maxVolumeM3 || Infinity))
      : false;

    const score = 
      distance * 0.6 + // Distance (60% weight)
      currentDeliveries * 200 + // Load penalty
      (rider.vehicleType?.perKmRate || 10) * 0.2 + // Cost factor
      (5 - (rider.rating || 3.5)) * 100; // Rating bonus

    scoredRiders.push({
      ...rider,
      score,
      canCarry,
      currentDeliveries,
      vehicleType: rider.vehicleType
    });
  }

  // 5. Select best available rider
  const bestRider = scoredRiders
    .filter(r => r.canCarry)
    .sort((a, b) => a.score - b.score)[0];

  if (!bestRider) {
    throw new Error('No suitable rider found within range');
  }

  // 6. Assign rider and create status log
  return await prisma.$transaction([
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        assignedRiderId: bestRider.id,
        deliveryStatus: 'assigned',
        updatedAt: new Date()
      },
      include: { assignedRider: true }
    }),
    prisma.deliveryStatusLog.create({
      data: {
        deliveryId,
        status: 'assigned',
        updatedById: bestRider.id,
        remarks: `Auto-assigned to ${bestRider.name} (Score: ${bestRider.score.toFixed(1)})`
      }
    })
  ]);
};
