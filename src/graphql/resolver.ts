import { PrismaClient } from '@prisma/client';
import { comparePassword, encryptPassword, generateTrackingNumber } from '../script/script.js';
import { OAuth2Client } from 'google-auth-library';
import { TextEncoder } from 'util';
import { PubSub, withFilter } from "graphql-subscriptions";


const prisma = new PrismaClient()
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { EncryptJWT } from 'jose';
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export const pubsub = new PubSub();
const LOCATION_TRACKING: any = "";
const NOTIFICATION_RECEIVED:any = "";
export const resolvers = {
  Query: {
    getUsers: async (_: any, args: { id: string }) => {return await prisma.user.findMany()},
    getUser: async (_: any, args: { id: string }) => { return await prisma.user.findUnique({ where: { id: args.id } })},
    getDeliveries: async (_: any, args: { id: string }) => { return await prisma.delivery.findMany()},
    getDelivery: async (_: any, args: { id: string }) => {
      return  await prisma.delivery.findUnique({ where:  { id: args.id } })
    },
    getRidersDelivery: async (_: any, args: { id: string }) => {
      const data = await prisma.delivery.findMany({
        where: {
          assignedRiderId: args.id, // Filter deliveries where this rider is assigned
        },
        include: {
          assignedRider: true, // Include full rider info in the response
        },
      });

      return data;
    },
    getVehicleTypes: async (_:any,_args:any) => {
      const data = await prisma.vehicleType.findMany();
      console.log(data);
      return data;
    },
    getRiders: async (_:any,_args:any) => {
      const data = await prisma.user.findMany({where: {role: 'RIDER'}});
      console.log(data);
      return data;
    }
  },
  Mutation:{
    createDelivery: async (_: any, args: any) => {
      try {
        const {
          senderId,
          recipientName,
          recipientPhone,
          pickupAddress,
          pickupLatitude,
          pickupLongitude,
          dropoffAddress,
          dropoffLatitude,
          dropoffLongitude,
          assignedRiderId,
          estimatedDeliveryTime // this is a string
        } = args.input;
    
        // ✅ 1. Validate sender exists
        const sender = await prisma.user.findUnique({
          where: { id: senderId }
        });
    
        if (!sender) {
          return {
            statusText: "error "+sender,
            message: `Sender with ID ${senderId} not found.`
          };
        }
    
        // ✅ 2. Validate assigned rider if provided
        let riderExists = null;
        if (assignedRiderId) {
          riderExists = await prisma.user.findUnique({
            where: { id: assignedRiderId }
          });
    
          if (!riderExists) {
            return {
              statusText: "error"+riderExists,
              message: `Assigned rider with ID ${assignedRiderId} not found.`
            };
          }
        }
    
        // ✅ 3. Safely parse estimatedDeliveryTime
        let parsedEstimatedTime: Date | undefined = undefined;
        if (estimatedDeliveryTime) {
          const parsed = new Date(estimatedDeliveryTime);
          if (isNaN(parsed.getTime())) {
            return {
              statusText: "error"+estimatedDeliveryTime,
              message: `Invalid date format for estimatedDeliveryTime: ${estimatedDeliveryTime}`
            };
          }
          parsedEstimatedTime = parsed;
        }
    
        // ✅ 4. Generate tracking number
        const trackingNumber = await generateTrackingNumber();
    
        // ✅ 5. Create the delivery
        const delivery = await prisma.delivery.create({
          data: {
            trackingNumber,
            sender: { connect: { id: senderId } },
            recipientName,
            recipientPhone,
            pickupAddress,
            pickupLatitude,
            pickupLongitude,
            dropoffAddress,
            dropoffLatitude,
            dropoffLongitude,
            assignedRider: assignedRiderId ? { connect: { id: assignedRiderId } } : undefined,
            deliveryStatus: "PENDING",
            estimatedDeliveryTime: parsedEstimatedTime
          },
          include: {
            sender: true,
            assignedRider: true
          }
        });
    
        return {
          statusText: "success",
          delivery
        };
    
      } catch (error: any) {
        console.error("Delivery creation error:", error);
        return {
          statusText: "error"+error,
          message: error.message || "Something went wrong"
        };
      }
    },    
    createRider: async (_: any, args: any) => {
      try {
        const {
          name,
          email,
          phoneNumber,
          vehicleTypeId,
          licensePlate,
          password // Expect plain text password here
        } = args.input;

        console.log("Received input:", args.input);

        const passwordHash = await encryptPassword(password, 10);

        const rider = await prisma.user.create({
          data: {
            name,
            email,
            phoneNumber,
            licensePlate,
            passwordHash, // Now correctly named and stored
            role: 'RIDER',
            vehicleType: {
              connect: { id: vehicleTypeId }
            },
            status: 'AVAILABLE',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          include: {
            vehicleType: true
          }
        });

        console.log("Created rider:", rider);
        return rider;

      } catch (error) {
        console.error("Error in createRider:", error); // 🔥 Now you’ll see the real problem
        throw new Error("Failed to create rider.");
      }
    },
    login: async (_: any, args: any) => {
    const { email, password } = args.input;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }
   
    const isValid = await comparePassword(password, user.passwordHash || '');

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const secret = new TextEncoder().encode('QeTh7m3zP0sVrYkLmXw93BtN6uFhLpAz'); // ✅ Uint8Array


    // Use JOSE to create encrypted token (JWE)
    const token = await new EncryptJWT({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      role:user.role,
      image:user.image
    })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .encrypt(secret);

    return {
      statusText: 'success',
      token
    };
    },
    loginWithGoogle: async (_: any, args: any) => {
    const { idToken } = args.input;
    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Invalid Google token');
    }

    const { email, name, picture } = payload;

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || 'Google User',
          phoneNumber: '', // Optional default
          passwordHash:'', // Optional default
          // Add any defaults needed for your schema
        },
      });
    }

    // Issue encrypted token
    const token = await new EncryptJWT({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      role:user.role,
      image:user.image
    })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .encrypt(secret);

    return {
      statusText: 'success',
      token
    };
    },
    loginWithFacebook: async (_: any, args: any) => {
    const { accessToken } = args.input;

// 1. Verify the token with Facebook Graph API
const fbRes = await fetch(
  `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
);
const fbUser = await fbRes.json();
console.log(fbUser);
if (!fbUser || !fbUser.id) {
  throw new Error('Invalid Facebook token');
}

const avatarUrl = fbUser.picture?.data?.url ?? '';

// 2. Find or create user in your DB
let user = await prisma.user.findUnique({
  where: { email: fbUser.email },
});

if (!user) {
  user = await prisma.user.create({
    data: {
      name: fbUser.name,
      email: fbUser.email,
      phoneNumber: '', // Facebook doesn't provide it
      passwordHash: '', // Use empty or a random placeholder
      image: avatarUrl,
    },
  });
}


    // 3. Return encrypted JWT
    const token = await new EncryptJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role:user.role,
      image:user.image
    })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .encrypt(secret);

    return {
      statusText: 'success',
      token
    };
    },
    locationTracking: async (_: any, args: any) => {
    try {
      pubsub.publish(LOCATION_TRACKING, { LocationTracking: args.input });
      return args.input;
     } catch (error) {
      console.log(error);
    }
    },
    sendNotification: async(_:any, { userID, title, message, type }:any) => {
      const notification = {
        id: String(Date.now()),
        user: { id: userID, name: "Test User" },
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      await prisma.notification.create({
        data: {
          userId: notification.user.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          isRead: notification.isRead,
          createdAt: new Date(notification.createdAt)
      }});
      pubsub.publish(NOTIFICATION_RECEIVED, {
        notificationReceived: notification,
      });

      return notification;
    },

 },
Subscription: {
  LocationTracking: {
    subscribe: withFilter(
      () => {
        const iterator = pubsub.asyncIterator([LOCATION_TRACKING]);
        return iterator;
      },
      (payload, variables) => {
        if (!variables.userID) return true;
        return payload.LocationTracking.userID === variables.userID;
      }
    ),
  },
  notificationReceived: {
    subscribe: withFilter(
      () => {
        const iterator = pubsub.asyncIterator([NOTIFICATION_RECEIVED]);
        return iterator;
      },
      (payload, variables) => {
        return payload.notificationReceived.user.id === variables.userID;
      }
    )
  },
}

}
