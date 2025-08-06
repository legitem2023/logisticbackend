import { PrismaClient } from '@prisma/client';
import { comparePassword, encryptPassword, generateTrackingNumber } from '../script/script.js';
import { autoAssignRider } from '../script/riderAssignment.js';
import { OAuth2Client } from 'google-auth-library';
import { TextEncoder } from 'util';
import { PubSub, withFilter } from "graphql-subscriptions";
import { notifier } from '../script/script.js';
import fs from 'fs';
import path from 'path';

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
    getUsers: async (_: any, args: { id: string }) => {
      return await prisma.user.findMany()},
    getUser: async (_: any, args: { id: string }) => { 
      return await prisma.user.findUnique({ where: { id: args.id } })},
    getDeliveries: async (_: any, args:any) => { 
      return await prisma.delivery.findMany({
        include: {
          sender: true,        // include rider info
          assignedRider:true,
          packages:true,
          proofOfDelivery:true
        },
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
          proofOfDelivery:true
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
            proofOfDelivery:true
          },
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
          proofOfDelivery:true
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return data;
    },
    getVehicleTypes: async (_:any,_args:any) => {
      const data = await prisma.vehicleType.findMany();
      return data;
    },
    getRiders: async (_:any,_args:any) => {
      const data = await prisma.user.findMany({where: {role: 'RIDER'},include:{
        vehicleType:true
      }});
      //console.log(data,"<===");
      return data;
    },
    getNotifications: async (_:any, args: { id: string }) => { 
      try {
         const Notification = await prisma.notification.findMany({  
          where: { 
            userId: args.id
          }
        })
        pubsub.publish(NOTIFICATION_RECEIVED, {
        notificationReceived: Notification,
      });
      return Notification

      } catch (error) {
        console.log(error);
      }
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
          estimatedDeliveryTime, // this is a string
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
            status: 'AVAILABLE',
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
       
    const { userID, latitude, longitude } = args.input;

    await prisma.user.update({
      where: { id: userID },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        lastUpdatedAt: new Date(),
      },
    });
  console.log(userID, latitude, longitude);
    pubsub.publish('LOCATION_TRACKING', { LocationTracking: args.input });

    return args.input;
  } catch (error) {
    console.log('Error updating location:', error);
    throw new Error('Failed to update location');
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
    uploadFile: async (_parent:any, { file }:any) => {
      // Wait for the file promise to resolve
      const { createReadStream, filename, mimetype, encoding } = await file;

      // Choose where to save the file
      const uploadDir = path.join(process.cwd(), 'public/uploads');

      // Make sure uploads folder exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }

      // Create file path
      const filePath = path.join(uploadDir, filename);

      // Save file to disk
      return new Promise((resolve, reject) => {
        const stream = createReadStream();
        const out = fs.createWriteStream(filePath);
        stream.pipe(out);
        out.on('finish', () =>
          resolve({
            filename,
            mimetype,
            encoding,
            url: `/public/uploads/${filename}`, // you can serve this statically
          })
        );
        out.on('error', reject);
      });
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
