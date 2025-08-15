/*import { PrismaClient } from '@prisma/client';
import { CronJob } from 'cron';

import { PubSub, withFilter } from "graphql-subscriptions";
const prisma = new PrismaClient();
export const pubsub = new PubSub();
export const markInactiveUsers = new CronJob(
  '* * * * *', // every minute
  async () => {
    const now = new Date();
    try {
      const result = await prisma.user.updateMany({
        where: {
          lastUpdatedAt: { lt: new Date(now.getTime() - 15 * 60_000) }, // 15 min inactivity
          status: { not: 'inactive' }
        },
        data: { status: 'inactive' }
      });

      if (result.count > 0) {
        console.log(`⏳ Marked ${result.count} users as inactive`);

        // Publish updates so clients know about the status change
        const inactiveUsers = await prisma.user.findMany({
          where: { status: 'inactive' }
        });

        inactiveUsers.forEach((user) => {
          pubsub.publish('LOCATION_TRACKING', {
            LocationTracking: {
              userID: user.id,
              latitude: user.currentLatitude,
              longitude: user.currentLongitude,
              status: 'inactive'
            }
          });
        });
      }
    } catch (error) {
      console.error('❌ Error marking inactive users:', error);
    }
  },
  null, // onComplete
  true, // start immediately
  'UTC' // timezone
);
*/
import { PrismaClient } from '@prisma/client';
import { CronJob } from 'cron';
import { PubSub } from 'graphql-subscriptions';

const prisma = new PrismaClient();
export const pubsub = new PubSub();

export const markInactiveUsers = new CronJob(
  '* * * * *', // every minute
  async () => {
    const now = new Date();

    try {
      // 1️⃣ Mark inactive riders
      const inactive = await prisma.user.updateMany({
        where: {
          lastUpdatedAt: { lt: new Date(now.getTime() - 15 * 60_000) },
          status: { not: 'inactive' }
        },
        data: { status: 'inactive' }
      });

      // 2️⃣ Mark busy riders (active with ongoing deliveries)
      const busy = await prisma.user.updateMany({
        where: {
          lastUpdatedAt: { gte: new Date(now.getTime() - 15 * 60_000) }, // recent update
          deliveries: {
            some: { deliveryStatus: { in: ['Pending', 'in_transit','assigned'] } }
          },
          status: { not: 'busy' }
        },
        data: { status: 'busy' }
      });

      // 3️⃣ Mark available riders (active, no deliveries)
      const available = await prisma.user.updateMany({
        where: {
          lastUpdatedAt: { gte: new Date(now.getTime() - 15 * 60_000) }, // recent update
          deliveries: {
            none: { deliveryStatus: { in: ['pending', 'in_progress'] } }
          },
          status: { not: 'available' }
        },
        data: { status: 'available' }
      });

      console.log(
        `✅ Updated statuses — Inactive: ${inactive.count}, Busy: ${busy.count}, Available: ${available.count}`
      );

      // Publish updates so clients know about the status change
      if (inactive.count > 0 || busy.count > 0 || available.count > 0) {
        const updatedUsers = await prisma.user.findMany({
          where: {
            OR: [
              { status: 'inactive' },
              { status: 'busy' },
              { status: 'available' }
            ]
          },
          select: {
            id: true,
            currentLatitude: true,
            currentLongitude: true,
            status: true
          }
        });

        updatedUsers.forEach((user) => {
          pubsub.publish('LOCATION_TRACKING', {
            LocationTracking: {
              userID: user.id,
              latitude: user.currentLatitude,
              longitude: user.currentLongitude,
              status: user.status
            }
          });
        });
      }
    } catch (error) {
      console.error('❌ Error marking inactive users:', error);
    }
  },
  null, // onComplete
  true, // start immediately
  'UTC' // timezone
);
