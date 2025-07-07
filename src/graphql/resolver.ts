import { PrismaClient } from '@prisma/client';
import { generateTrackingNumber } from '../script/script.js';
const prisma = new PrismaClient()
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { EncryptJWT } from 'jose';

export const resolvers = {
  Query: {
    getUsers: () => prisma.user.findMany(),
    getUser: (_: any, args: { id: string }) => prisma.user.findUnique({ where: { id: args.id } }),
    getDeliveries: () => prisma.delivery.findMany(),
    getDelivery: (_: any, args: { id: string }) =>
      prisma.delivery.findUnique({ where: { id: args.id } }),

    getVehicleTypes: () => prisma.vehicleType.findMany(),
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
          estimatedDeliveryTime
        } = args.input;

  const trackingNumber = await generateTrackingNumber();



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
            estimatedDeliveryTime
          },
          include: {
            sender: true,
            assignedRider: true
          }
        })
        console.log(trackingNumber)
        if(delivery) {
          return {
            statusText: "success",
          }
        }
      } catch (error) {
        console.log(error)
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
          passwordHash
        } = args.input;   
        
        const rider = await prisma.user.create({
          data: {
            name,
            email,
            phoneNumber,
            licensePlate,
            passwordHash,
            vehicleType: {
              connect: { id: vehicleTypeId }
            },
            status: 'AVAILABLE', // or default to 'INACTIVE'
            createdAt: new Date(),
            updatedAt: new Date()
          },
          include: {
            vehicleType: true
          }
        })
      
        return rider

      } catch (error) {
        
      }

   },
   login: async (_: any, args: any) => {
    const { email, password } = args.input;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash || '');
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    const secret:any = process.env.JWT_SECRET;
    // Use JOSE to create encrypted token (JWE)
    const token = await new EncryptJWT({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name
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
 },
}

