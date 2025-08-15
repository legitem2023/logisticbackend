import { PrismaClient } from '@prisma/client';
import { CronJob } from 'cron';
import { pubsub } from '../graphql/pubsub.js'; // adjust import path

const prisma = new PrismaClient();

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
