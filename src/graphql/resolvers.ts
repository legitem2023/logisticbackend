import { PrismaClient } from '@prisma/client';
import { comparePassword, encryptPassword, generateTrackingNumber } from '../script/script.js';
import { autoAssignRider } from '../script/riderAssignment.js';
import { OAuth2Client } from 'google-auth-library';
import { TextEncoder } from 'util';
import { PubSub, withFilter } from "graphql-subscriptions";
import { notifier } from '../script/script.js';
import { saveBase64Image } from '../script/saveBase64Image.js';
import { v4 as uuidv4 } from 'uuid';
import { PasswordResetService } from '../Services/PasswordResetService.js';
import { EmailServiceConfig } from '../Services/EmailService.js';

// Define input types for TypeScript
interface RequestPasswordResetInput {
  email: string;
}

interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

interface ValidateResetTokenInput {
  token: string;
}

// Initialize the password reset service
const emailConfig: EmailServiceConfig = {
  service: process.env.EMAIL_SERVICE as 'sendgrid' | 'resend' | 'nodemailer' | 'console' || 'console',
  apiKey: process.env.EMAIL_APIKEY,
  fromEmail: 'onboarding@adiviso.com',//'robertsancomarquez1988@gmail.com',// process.env.FROM_EMAIL || 'noreply@adiviso.com',
  appName: process.env.APP_NAME || 'Pramatiso Express',
  baseUrl: process.env.BASE_URL || 'https://adiviso.com'
};

const passwordResetService = new PasswordResetService(emailConfig);

//import { calculateEta, convertMinutesToHours } from '../script/calculateEta.js';

import {
  FacebookLoginInput,
  LoginResponse,
  LogoutResponse,
  AuthStatus,
  User,
  UserRole,
  Context
} from './types/graphql.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient()
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { EncryptJWT, jwtDecrypt } from 'jose';
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export const pubsub = new PubSub();
export function getMinuteDiff(
  start?: Date | number,
  end?: Date | number
): number | null {
  if (!start || !end) return null;

  const startMs = start instanceof Date ? start.getTime() : start * 1000;
  const endMs = end instanceof Date ? end.getTime() : end * 1000;

  const diffMs = Math.abs(endMs - startMs);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  return totalMinutes;
}
const LOCATION_TRACKING: any = "";
const NOTIFICATION_RECEIVED:any = "";
export const resolvers = {
  Query: {
    getAllPasswordResets: async (_:any,_args:any) => {
      try {
        return await prisma.passwordReset.findMany({
          include: {
            user: true
          }
        });
      } catch (error) {
        console.error('Error fetching all password resets:', error);
        throw new Error('Failed to fetch password reset records');
      }
    },
    getUsers: async (_: any, args: any) => {
    return await prisma.user.findMany({
      include: {
        vehicleType: true, // ✅ use `true` not `trud`
       },
     });
   },
    getUser: async (_: any, args: { id: string }) => { 
      return await prisma.user.findUnique({ 
        where: { id: args.id },
        include: {
        vehicleType: true, // ✅ use `true` not `trud`
       },
    })},
    getDeliveries: async (_: any, args:any) => { 
      return await prisma.delivery.findMany({
        include: {
          sender: true,        // include rider info
          assignedRider:true,
          packages:true,
          proofOfDelivery:true,
          proofOfPickup:true
        }
      })
    },
    getDispatch: async (_:any, args: {id: string }) =>{
      try {
        const data = await prisma.delivery.findMany({
        where: {
          senderId: args.id, // Filter deliveries where this rider is assigned
        },
        include: {
          sender:true,
          assignedRider: true, // Include full rider info in the response
          packages:true,
          proofOfDelivery:true,
          proofOfPickup:true
        },        
        orderBy: {
          createdAt: 'desc',
        },
      });

      return data;
      } catch (error) {
        
      }
    },
    getDelivery: async (_: any, args: { id: string }) => {
      return  await prisma.delivery.findUnique(
        { 
          where:  { id: args.id },
          include: {
            sender: true,        // include rider info
            assignedRider:true,
            packages:true,
            proofOfDelivery:true,
            proofOfPickup:true
          }
        })
    },
    getRidersDelivery: async (_: any, args: { id: string }) => {
      const data = await prisma.delivery.findMany({
        where: {
          assignedRiderId: args.id, // Filter deliveries where this rider is assigned
        },
        include: {
          sender:true,
          assignedRider: true, // Include full rider info in the response
          packages:true,
          proofOfDelivery:true,
          proofOfPickup:true
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return data;
    },
    getWallet: async (_:any,args:{ userId:string }) =>{
        const data = await prisma.wallet.findUnique({
          where: {
            userId:args.userId
          },
          include:{
            transactions:true
          }
        })
      if(data){
        return data;
      }
    },
    getVehicleTypes: async (_:any,_args:any) => {
      const data = await prisma.vehicleType.findMany();
      return data;
    },
getRiders: async (_: any, _args: any) => {
  const data = await prisma.user.findMany(/*{
    where: {
      role: {
        equals: "rider",
        mode: 'insensitive'
      },
      status: {
        equals: "available",
        mode: 'insensitive'
      },
      lastUpdatedAt: { 
        gte: new Date(Date.now() - 45 * 60 * 1000)
      },
      currentLatitude: { not: null },
      currentLongitude: { not: null },
    }
  }*/);
  return data;
},
    getNotifications: async (_:any, args: { id: string }) => { 
      try {
         const Notification = await prisma.notification.findMany({  
          where: { 
            userId: args.id
          },        
          orderBy: {
            createdAt: 'desc',
           },
        })
        pubsub.publish(NOTIFICATION_RECEIVED, {
        notificationReceived: Notification,
      });
      return Notification

      } catch (error) {
        console.log(error);
      }
    },
    
    // Password Reset Stats Query
    passwordResetStats: async () => {
      try {
        return passwordResetService.getStats();
      } catch (error) {
        console.error('Error getting password reset stats:', error);
        throw new Error('Failed to get password reset statistics');
      }
    },
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
          estimatedDeliveryTime, // this is a string
          eta, 
          deliveryType,
          paymentStatus,
          paymentMethod,
          deliveryFee,
          baseRate,
          perKmRate,
          distance
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
            deliveryStatus: "Pending",
            estimatedDeliveryTime: parsedEstimatedTime,
            eta,
            deliveryType,
            paymentStatus,
            paymentMethod,
            deliveryFee,
            baseRate,
            perKmRate,
            distance
          },
          include: {
            sender: true,
            assignedRider: true
          }
        });

      const notification = {
        id: String(Date.now()),
        user: { id: "686ffdf59a1ad0a2e9c79f0b"},
        title: "New Delivery Created",
        message: `Assign a Rider to this delivery`,
        type: "delivery",
        isRead: false,
        createdAt: new Date().toISOString(),
      };

        await prisma.notification.create({
          data: {
            userId: "686ffdf59a1ad0a2e9c79f0b",
            title: notification.title,
            message: notification.message,
            type: notification.type,
            isRead: notification.isRead,
            createdAt: new Date(notification.createdAt)
        }});
      
        pubsub.publish(NOTIFICATION_RECEIVED, {
          notificationReceived: notification,
        });

  // 2c. Log the reassignment
      await prisma.deliveryStatusLog.create({
        data: {
          deliveryId: delivery.id,
          status: 'reassigned',
          updatedById: assignedRiderId,
          remarks: `Auto-reassigned from ${delivery.assignedRider?.name}`
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
createSender: async (_: any, args: any) => {
      try {
        const {
          name,
          email,
          phoneNumber,
          password, // Expect plain text password here
          address
        } = args.input;

        const passwordHash = await encryptPassword(password, 10);

        const sender = await prisma.user.create({
          data: {
            name,
            email,
            phoneNumber,
            passwordHash, // Now correctly named and stored
            role: 'Sender',
            status: 'available',
            address,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          include: {
            vehicleType: true
          }
        });

        return {
          statusText: "success",
        };

      } catch (error) {
        return {
          statusText: "Error"+ error,
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
          password, // Expect plain text password here
          photo,
          license
        } = args.input;

      const UUID = uuidv4();
      // Save images
      const profilePhotoFile = await saveBase64Image(photo, `photo-${UUID}.jpg`);
      const licenseFile = await saveBase64Image(license, `license-${UUID}.jpg`);

        const passwordHash = await encryptPassword(password, 10);

        const rider = await prisma.user.create({
          data: {
            name,
            email,
            phoneNumber,
            licensePlate,
            passwordHash, // Now correctly named and stored
            role: 'Rider',
            vehicleTypeId,
            status: 'available',
            image:profilePhotoFile.url,
            license:licenseFile.url,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          include: {
            vehicleType: true
          }
        });

        return {
          statusText: "success",
        };

      } catch (error) {
        return {
          statusText: "Error"+ error,
        };
      }
    },
editRider: async (_: any, args: any) =>{
      const {  id, name, email, phoneNumber, vehicleTypeId, licensePlate, role } = args.input;
      const result = await prisma.user.update({
        where:{
          id:id
        },
        data:{
          name,
          email,
          phoneNumber,
          vehicleTypeId,
          licensePlate,
          role
        }
      })
      if(result){
        return {
          statusText:'Successful'
        }
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
    const { idToken } = args.input;

// 1. Verify the token with Facebook Graph API
const fbRes = await fetch(
  `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${idToken}`
);
const fbUser = await fbRes.json();
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
      role:'Sender'
    },
  });
}

    const secret = new TextEncoder().encode('QeTh7m3zP0sVrYkLmXw93BtN6uFhLpAz'); // ✅ Uint8Array

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
 logout: async (_: any, __: any, context: Context): Promise<LogoutResponse> => {
      try {
        const { token } = context;

        if (!token) {
          return {
            success: false,
            message: 'No authentication token provided'
          };
        }

        // Decrypt token to get user info
        const { payload } = await jwtDecrypt(token, secret);
        
        // Add token to blacklist (valid for 7 days)
        await prisma.blacklistedToken.upsert({
          where: { token },
          update: { 
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
          },
          create: {
            token,
            userId: payload.userId as string,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        });

        return {
          success: true,
          message: 'Successfully logged out'
        };
      } catch (error) {
        console.error('Logout error:', error);
        return {
          success: false,
          message: 'Failed to complete logout process'
        };
      }
    },

    logoutAllDevices: async (_: any, __: any, context: Context): Promise<LogoutResponse> => {
      try {
        const { token } = context;

        if (!token) {
          return {
            success: false,
            message: 'No authentication token provided'
          };
        }

        // Decrypt token to get user info
        const { payload } = await jwtDecrypt(token, secret);
        
        // Blacklist all tokens for this user
        await prisma.blacklistedToken.deleteMany({
          where: { userId: payload.userId as string }
        });

        return {
          success: true,
          message: 'Logged out from all devices'
        };
      } catch (error) {
        console.error('Logout all devices error:', error);
        return {
          success: false,
          message: 'Failed to logout from all devices'
        };
      }
    },
  
locationTracking: async (_: any, args: any) => {
  try {
    const { userID, latitude, longitude } = args.input;

    // Fetch user's last update time
    const user = await prisma.user.findUnique({
      where: { id: userID }
    });

    const now = new Date();
    const shouldUpdate =
      !user?.lastUpdatedAt ||
      (now.getTime() - new Date(user?.lastUpdatedAt).getTime()) >= 60_000; // 1 min

    if (shouldUpdate) {
      // Determine status based on rules
      let newStatus = user?.status || "available";

      if (!latitude || !longitude) {
        newStatus = "offline";
      } else if (user?.status === "busy") {
        // Keep busy status until task completion
        newStatus = "busy";
      } else {
        const idleTime = now.getTime() - new Date(user?.lastUpdatedAt || now).getTime();
        if (idleTime >= 15 * 60_000) { // 15 min
          newStatus = "inactive";
        } else {
          newStatus = "available";
        }
      }

      // Update location + status in DB
      await prisma.user.update({
        where: { id: userID },
        data: {
          currentLatitude: latitude,
          currentLongitude: longitude,
          lastUpdatedAt: now,
          status: newStatus,
        },
      });

      console.log(`Updated ${userID}: ${latitude}, ${longitude}, status=${newStatus}`);
    } else {
      console.log(`Skipped DB update for ${userID} (last update < 1 min ago)`);
    }

    // Always publish real-time updates
    pubsub.publish("LOCATION_TRACKING", { LocationTracking: args.input });

    return args.input;
  } catch (error) {
    console.log("Error updating location:", error);
    throw new Error("Failed to update location");
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
    acceptDelivery: async (_:any, { deliveryId, riderId }:any) => {
      const updated = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          assignedRiderId: riderId,
          deliveryStatus: "in_transit",
          statusLogs: {
            create: {
              status: "in_transit",
              updatedById: riderId,
              timestamp: new Date(),
              remarks: "Rider accepted the delivery",
            },
          },
        },
        include:{
          assignedRider: true,
          sender:true
        },
      })
      const Rider = updated.assignedRider?.name;

      const notification = {
        id: String(Date.now()),
        user: { id: updated.senderId, name: updated.sender.name },
        title: "Delivery Accepted",
        message: `Delivery accepted by ${Rider}`,
        type: "delivery",
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
      if(updated){
        return {
          statusText: "success",
        }
      }
  return updated
    },
    markPaid: async (_:any, { deliveryId, riderId, code }:any) => {
      const updated = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          paymentCode: code,
          paymentMethod: "Cash",
          paymentStatus: "Paid",
        },
        include:{
          assignedRider: true,
          sender:true
        },
      })
      const Rider = updated.assignedRider?.name;

      const notification = {
        id: String(Date.now()),
        user: { id: updated.senderId, name: updated.sender.name },
        title: "Delivery Paid",
        message: `Delivery Paid`,
        type: "delivery",
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
      
      if(updated){
        return {
          statusText: "success",
        }
      }
      return updated
    },
    skipDelivery: async (_:any, { deliveryId, riderId }:any) => {
      const updated = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          assignedRiderId: null,
          deliveryStatus: "unassigned",
          rejection: {
            create:{
              riderId:riderId
            }
          },
          statusLogs: {
            create: {
              status: "Skipped by rider",
              updatedById: riderId,
              timestamp: new Date(),
              remarks: "Rider skipped the delivery",
            },
          },
        },
        include:{
          assignedRider: true,
          sender:true
        },
      })
      const Rider = updated.assignedRider?.name;

      const notification = {
        id: String(Date.now()),
        user: { id: updated.senderId, name: updated.sender.name },
        title: "Delivery Skipped",
        message: `Delivery skipped by ${Rider}`,
        type: "delivery",
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
      
      if(updated){
        return {
          statusText: "success",
        }
      }
      return updated
    },
    finishDelivery: async (_:any, { deliveryId, riderId }:any) => {
      const updated = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          assignedRiderId: riderId,
          deliveryStatus: "Delivered",
          statusLogs: {
            create: {
              status: "Delivered",
              updatedById: riderId,
              timestamp: new Date(),
              remarks: "Rider delivered the delivery",
            },
          },
        },
        include:{
          assignedRider: true,
          sender:true
        },
      })
      const Rider = updated.assignedRider?.name;
       const notification = {
        id: String(Date.now()),
        user: { id: updated.senderId, name: updated.sender.name },
        title: "Delivery Finished",
        message: `Delivery Finished by ${Rider}`,
        type: "delivery",
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
      if(updated){
        return {
          statusText: "success",
        }
      }
  return updated
  
    },
    cancelDelivery: async (_:any, { deliveryId, riderId }:any) => {
      const updated = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          assignedRiderId: riderId,
          deliveryStatus: "Cancelled",
          statusLogs: {
            create: {
              status: "Cancelled",
              updatedById: riderId,
              timestamp: new Date(),
              remarks: "Delivery Cancelled",
            },
          },
        },
        include:{
          assignedRider: true,
          sender:true
        },
      })
      const Rider = updated.assignedRider?.name;

       const notification = {
        id: String(Date.now()),
        user: { id: updated.senderId, name: updated.sender.name },
        title: "Delivery Cancelled",
        message: `Delivery Cancelled by ${Rider}`,
        type: "delivery",
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
      if(updated){
        return {
          statusText: "success",
        }
      }
  return updated
    },
    createRouteHistory: async (_:any, {deliveryId, riderId,latitude,longitude}:any) =>{
      try {
        const updated = await prisma.routeHistory.create({
          data:{
            riderId,
            deliveryId,
            latitude,
            longitude,
            recordedAt:new Date().toISOString()
          }
        })
        if(updated){
          return {
            statusText:"Success"
          }
        }
      } catch (error) {
        
      }
    },
    assignRider: async (_:any, { deliveryId, riderId }:any) => {
      try {
        const updated = await prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            assignedRiderId: riderId,
            deliveryStatus: "assigned",
          },
        });

      const notification = {
        id: String(Date.now()),
        user: { id: riderId },
        title: "You have been assigned a delivery",
        message: `You have been assigned a delivery`,
        type: "delivery",
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


        if(updated){
          return {
            statusText:"Success"
          }
        }
      } catch (error) {
        
      }
    },
  createPackage: async (_: any, { deliveryId, packageType, weight, dimensions, specialInstructions }: any) => {
    try {
    // Create the package
    const createdPackage = await prisma.package.create({
      data: {
        deliveryId,
        packageType,
        weight,
        dimensions,
        specialInstructions
      }
    });

    // Attempt to auto-assign a rider
    const isAssigned = await autoAssignRider(deliveryId);
    
    if (!isAssigned) {
      // If assignment fails, update delivery status
      await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          deliveryStatus: "unassigned",
          updatedAt: new Date()
        }
      });
    }

    // Return success response
    return { statusText: "Success" };
    
  } catch (error) {
    console.error("Error in createPackage:", error);
    throw error; // Consider throwing the error or returning an error response
  }
},
    readNotification: async (_:any, { notificationId }:any) => {
      try {
        const updated = await prisma.notification.update({
          where: { id: notificationId },
          data: {
            isRead: true,
          },
        });
        if(updated){
          return {
            statusText:"Success"
          }
        }
      } catch (error) {
       console.log(error); 
      }
    },
    deleteNotification: async (_:any, { notificationId }:any) => {
      try {
        const updated = await prisma.notification.delete({
          where: { id: notificationId },
        });
        if(updated){
          return {
            statusText:"Success"
          }
        }
      } catch (error) {
       console.log(error); 
      }
    },
    uploadFile: async (_parent: any, { file }: any) => {

      const { id, receivedBy, receivedAt, photoUrl, signatureData } = file;
      const photoUUID = uuidv4();
      const signatureUUID = uuidv4();
      // Save images
      const photoFile = await saveBase64Image(photoUrl, `photo-${photoUUID}.jpg`);
      const signatureFile = await saveBase64Image(signatureData, `signature-${signatureUUID}.png`);

      // Save to DB
      const record = await prisma.proofOfDelivery.create({
        data: {
          deliveryId:id,
          receivedBy:receivedBy,
          receivedAt: new Date(receivedAt),
          photoUrl: photoFile.url,
          signatureData: signatureFile.url,
        },
      });

      const timeStarted = await prisma.deliveryStatusLog.findFirst({
               where: {
                   deliveryId: id,
                   status: "TimeStart",
               },
               select:{
                 timestamp:true
               }
             })
      const nowUnix = Math.floor(Date.now() / 1000); 
      const timeInterval = getMinuteDiff(timeStarted?.timestamp,nowUnix);
      console.log("timestamp",timeInterval);
     await prisma.delivery.update({
          where: { id: id },
          data: {
            actualDeliveryTime: new Date(),
            ata: timeInterval ? timeInterval.toString() : "",
            updatedAt: new Date()
           }
         });
      
      return {
        statusText:'Success'
      };
    },
    insertPickupProof: async (_parent: any, { input }: any) =>{
      const {id, 
             riderId,
             pickupDateTime, 
             pickupAddress, 
             pickupLatitude, 
             pickupLongitude, 
             customerName, 
             customerSignature, 
             proofPhotoUrl, 
             packageCondition, 
             numberOfPackages, 
             otpCode, 
             remarks,
             status
            } = input
      const photoUUID = uuidv4();
      const PhotoURL = await saveBase64Image(proofPhotoUrl, `proofPickUp-${photoUUID}.jpg`);
      const customerSign = await saveBase64Image(customerSignature, `proofPickUpSignature-${photoUUID}.png`);

      const record = await prisma.proofOfPickup.create({
        data:{
          deliveryId:id,
          pickupById:riderId,
          pickupDateTime,
          pickupAddress,
          pickupLatitude,
          pickupLongitude,
          customerName,
          customerSignature:customerSign.url,
          proofPhotoUrl:PhotoURL.url ,
          packageCondition,
          numberOfPackages,
          otpCode,
          remarks,
          status,
          updatedAt: new Date(),
          createdAt: new Date()
        }
      })
      await prisma.deliveryStatusLog.create({
              data:{
                status: "TimeStart",
                deliveryId:id,
                updatedById: riderId,
                timestamp: new Date(),
                remarks: "Delivery Time Start"
          }
      })
      return {
        statusText:'Success'
      };
    },


 requestPasswordReset: async (_: any, { input }: { input: RequestPasswordResetInput }) => {
      try {
        const { email } = input;

        if (!email) {
          throw new Error('Email is required');
        }

        // Check if user exists with this email
        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          // For security, don't reveal that the email doesn't exist
          return {
            statusText:'Account doesnt exist!'
          };
        }

        const result = await passwordResetService.requestPasswordReset(email);
        return {
            statusText:'Success'
        };
      } catch (error) {
        console.error('Error in requestPasswordReset resolver:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to request password reset'
        );
      }
    },
    resetPassword: async (_: any, { input }: { input: ResetPasswordInput }) => {
  try {
    const { token, newPassword } = input;

    if (!token || !newPassword) {
      throw new Error('Token and new password are required');
    }

    const result = await passwordResetService.resetPassword(token, newPassword);
    
    if (result.success) {
      // Update the user's password in the database
      const tokenValidation:any = await passwordResetService.validateResetToken(token);
      if (tokenValidation.valid) {
        const passwordHash = await encryptPassword(newPassword, 10);
        await prisma.user.update({
          where: { email: tokenValidation.email },
          data: { 
             passwordHash 
          }
        });
        return {
          statusText: result.message // Changed from result.success to result.message
        };
      } else {
        return {
          statusText: tokenValidation.message
        };
      }
    } else {
      return {
        statusText: result.message
      };
    }
    
  } catch (error) {
    console.error('Error in resetPassword resolver:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to reset password'
    );
  }
},
editpassword: async (_: any, args: any) => {
  const email = args.email;
  const newpassword = args.password;
  const passwordHash = await encryptPassword(args.password, 10);

  const result = await prisma.user.update({
    where: { email },
    data: {
      passwordHash
    }
  });
  
  if (result) {
    return {
      statusText: 'Successful'  // Changed from semicolon to comma
    };
  }
  
  // Return an error object if the update failed
  return {
    statusText: 'Failed to update password'
  };
},
    validateResetToken: async (_: any, { input }: { input: ValidateResetTokenInput }) => {
      try {
        const { token } = input;

        if (!token) {
          throw new Error('Token is required');
        }

        const result = passwordResetService.validateResetToken(token);
        return result;
      } catch (error) {
        console.error('Error in validateResetToken resolver:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to validate token'
        );
      }
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
