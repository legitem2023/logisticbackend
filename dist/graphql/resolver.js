import { PrismaClient } from '@prisma/client';
import { generateTrackingNumber } from '../script/script.js';
const prisma = new PrismaClient();
export const resolvers = {
    Query: {
        getUsers: () => prisma.user.findMany(),
        getUser: (_, args) => prisma.user.findUnique({ where: { id: args.id } }),
        getDeliveries: () => prisma.delivery.findMany(),
        getDelivery: (_, args) => prisma.delivery.findUnique({ where: { id: args.id } }),
        getVehicleTypes: () => prisma.vehicleType.findMany(),
    },
    Mutation: {
        createDelivery: async (_, args) => {
            try {
                const { senderId, recipientName, recipientPhone, pickupAddress, pickupLatitude, pickupLongitude, dropoffAddress, dropoffLatitude, dropoffLongitude, assignedRiderId, estimatedDeliveryTime } = args.input;
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
                });
                console.log(trackingNumber);
                if (delivery) {
                    return {
                        statusText: "success",
                    };
                }
            }
            catch (error) {
                console.log(error);
            }
        },
        createRider: async (_, args) => {
            try {
                const { name, email, phoneNumber, vehicleTypeId, licensePlate, passwordHash } = args.input;
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
                });
                return rider;
            }
            catch (error) {
            }
        }
    }
};
