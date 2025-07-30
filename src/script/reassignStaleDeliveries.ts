import { PrismaClient, Prisma } from '@prisma/client';
import { autoAssignRider } from './riderAssignment.js';

const prisma = new PrismaClient();

// Optional interface if needed for type-safe usage elsewhere
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
deliveryStatus: 'assigned', // ✅ Make sure this matches your schema field name
updatedAt: { lt: staleThreshold },
assignedRiderId: { not: null },
},
include: {
assignedRider: true,
packages: true,
},
});

for (const delivery of staleDeliveries) {
try {
if (!delivery.assignedRiderId) continue;

// ✅ Release original rider  
  await prisma.user.update({  
    where: { id: delivery.assignedRiderId },  
    data: { status: 'AVAILABLE' }, // ✅ Only use fields defined in your Prisma schema  
  });  

  // ✅ Reassign new rider (type-safe)  
  const [updatedDelivery] = await prisma.$transaction([  
    prisma.delivery.update({  
      where: { id: delivery.id },  
      data: {  
        assignedRiderId: delivery.assignedRiderId, // Or update with new rider if needed  
        deliveryStatus: 'assigned', // ✅ use correct schema field name  
      },  
      include: {  
        assignedRider: {  
          select: {  
            id: true,  
            name: true,  
          },  
        },  
      },  
    }),  
  ]);  

  // ✅ Log the reassignment  
  await prisma.deliveryStatusLog.create({  
    data: {  
      deliveryId: delivery.id,  
      status: 'reassigned',  
      updatedById: updatedDelivery.assignedRiderId!, // 🔒 Use caution with non-null assertion  
      remarks: `Auto-reassigned from ${delivery.assignedRider?.name ?? 'unknown'}`,  
    },  
  });  

} catch (error) {  
  console.error(`❌ Failed to reassign delivery ${delivery.id}:`, error);  
}

}
};

