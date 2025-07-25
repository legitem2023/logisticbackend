import { PrismaClient } from '@prisma/client';
import { comparePassword, encryptPassword, generateTrackingNumber } from '../script/script.js';
import { OAuth2Client } from 'google-auth-library';
import { TextEncoder } from 'util';
import { PubSub, withFilter } from "graphql-subscriptions";
const prisma = new PrismaClient();
import { EncryptJWT } from 'jose';
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export const pubsub = new PubSub();
const LOCATION_TRACKING = "";
const NOTIFICATION_RECEIVED = "";
export const resolvers = {
    Query: {
        getUsers: async (_, args) => {
            return await prisma.user.findMany();
        },
        getUser: async (_, args) => {
            return await prisma.user.findUnique({ where: { id: args.id } });
        },
        getDeliveries: async (_, args) => {
            return await prisma.delivery.findMany({
                include: {
                    sender: true, // include rider info
                    assignedRider: true,
                    packages: true,
                },
            });
        },
        getDispatch: async (_, args) => {
            try {
                const data = await prisma.delivery.findMany({
                    where: {
                        senderId: args.id, // Filter deliveries where this rider is assigned
                    },
                    include: {
                        sender: true,
                        assignedRider: true, // Include full rider info in the response
                        packages: true,
                    },
                });
                return data;
            }
            catch (error) {
            }
        },
        getDelivery: async (_, args) => {
            return await prisma.delivery.findUnique({
                where: { id: args.id },
                include: {
                    sender: true, // include rider info
                    assignedRider: true,
                    packages: true,
                },
            });
        },
        getRidersDelivery: async (_, args) => {
            const data = await prisma.delivery.findMany({
                where: {
                    assignedRiderId: args.id, // Filter deliveries where this rider is assigned
                },
                include: {
                    sender: true,
                    assignedRider: true, // Include full rider info in the response
                    packages: true,
                },
            });
            return data;
        },
        getVehicleTypes: async (_, _args) => {
            const data = await prisma.vehicleType.findMany();
            console.log(data);
            return data;
        },
        getRiders: async (_, _args) => {
            const data = await prisma.user.findMany({ where: { role: 'RIDER' }, include: {
                    vehicleType: true
                } });
            console.log(data);
            return data;
        },
        getNotifications: async (_, args) => {
            try {
                const Notification = await prisma.notification.findMany({
                    where: {
                        userId: args.id
                    }
                });
                pubsub.publish(NOTIFICATION_RECEIVED, {
                    notificationReceived: Notification,
                });
                return Notification;
            }
            catch (error) {
                console.log(error);
            }
        }
    },
    Mutation: {
        createDelivery: async (_, args) => {
            try {
                const { senderId, recipientName, recipientPhone, pickupAddress, pickupLatitude, pickupLongitude, dropoffAddress, dropoffLatitude, dropoffLongitude, assignedRiderId, estimatedDeliveryTime, // this is a string
                deliveryType, paymentStatus, paymentMethod, deliveryFee, baseRate, perKmRate, distance } = args.input;
                // ✅ 1. Validate sender exists
                const sender = await prisma.user.findUnique({
                    where: { id: senderId }
                });
                if (!sender) {
                    return {
                        statusText: "error " + sender,
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
                            statusText: "error" + riderExists,
                            message: `Assigned rider with ID ${assignedRiderId} not found.`
                        };
                    }
                }
                // ✅ 3. Safely parse estimatedDeliveryTime
                let parsedEstimatedTime = undefined;
                if (estimatedDeliveryTime) {
                    const parsed = new Date(estimatedDeliveryTime);
                    if (isNaN(parsed.getTime())) {
                        return {
                            statusText: "error" + estimatedDeliveryTime,
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
                return {
                    statusText: "success",
                    delivery
                };
            }
            catch (error) {
                console.error("Delivery creation error:", error);
                return {
                    statusText: "error" + error,
                    message: error.message || "Something went wrong"
                };
            }
        },
        createRider: async (_, args) => {
            try {
                const { name, email, phoneNumber, vehicleTypeId, licensePlate, password // Expect plain text password here
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
            }
            catch (error) {
                return {
                    statusText: "Error" + error,
                };
            }
        },
        login: async (_, args) => {
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
                role: user.role,
                image: user.image
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
        loginWithGoogle: async (_, args) => {
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
                        passwordHash: '', // Optional default
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
                role: user.role,
                image: user.image
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
        loginWithFacebook: async (_, args) => {
            var _a, _b, _c;
            const { accessToken } = args.input;
            // 1. Verify the token with Facebook Graph API
            const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`);
            const fbUser = await fbRes.json();
            console.log(fbUser);
            if (!fbUser || !fbUser.id) {
                throw new Error('Invalid Facebook token');
            }
            const avatarUrl = (_c = (_b = (_a = fbUser.picture) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.url) !== null && _c !== void 0 ? _c : '';
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
                role: user.role,
                image: user.image
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
        locationTracking: async (_, args) => {
            try {
                pubsub.publish(LOCATION_TRACKING, { LocationTracking: args.input });
                return args.input;
            }
            catch (error) {
                console.log(error);
            }
        },
        sendNotification: async (_, { userID, title, message, type }) => {
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
                }
            });
            pubsub.publish(NOTIFICATION_RECEIVED, {
                notificationReceived: notification,
            });
            return notification;
        },
        acceptDelivery: async (_, { deliveryId, riderId }) => {
            var _a;
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
                include: {
                    assignedRider: true,
                    sender: true
                },
            });
            const Rider = (_a = updated.assignedRider) === null || _a === void 0 ? void 0 : _a.name;
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
                }
            });
            pubsub.publish(NOTIFICATION_RECEIVED, {
                notificationReceived: notification,
            });
            if (updated) {
                return {
                    statusText: "success",
                };
            }
            return updated;
        },
        finishDelivery: async (_, { deliveryId, riderId }) => {
            var _a;
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
                include: {
                    assignedRider: true,
                    sender: true
                },
            });
            const Rider = (_a = updated.assignedRider) === null || _a === void 0 ? void 0 : _a.name;
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
                }
            });
            pubsub.publish(NOTIFICATION_RECEIVED, {
                notificationReceived: notification,
            });
            if (updated) {
                return {
                    statusText: "success",
                };
            }
            return updated;
        },
        cancelDelivery: async (_, { deliveryId, riderId }) => {
            var _a;
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
                include: {
                    assignedRider: true,
                    sender: true
                },
            });
            const Rider = (_a = updated.assignedRider) === null || _a === void 0 ? void 0 : _a.name;
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
                }
            });
            pubsub.publish(NOTIFICATION_RECEIVED, {
                notificationReceived: notification,
            });
            if (updated) {
                return {
                    statusText: "success",
                };
            }
            return updated;
        },
        createRouteHistory: async (_, { deliveryId, riderId, latitude, longitude }) => {
            try {
                const updated = await prisma.routeHistory.create({
                    data: {
                        riderId,
                        deliveryId,
                        latitude,
                        longitude,
                        recordedAt: new Date().toISOString()
                    }
                });
                if (updated) {
                    return {
                        statusText: "Success"
                    };
                }
            }
            catch (error) {
            }
        },
        assignRider: async (_, { deliveryId, riderId }) => {
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
                    }
                });
                pubsub.publish(NOTIFICATION_RECEIVED, {
                    notificationReceived: notification,
                });
                if (updated) {
                    return {
                        statusText: "Success"
                    };
                }
            }
            catch (error) {
            }
        },
        createPackage: async (_, { deliveryId, packageType, weight, dimensions, specialInstructions }) => {
            try {
                const updated = await prisma.package.create({
                    data: {
                        deliveryId,
                        packageType,
                        weight,
                        dimensions,
                        specialInstructions
                    }
                });
                if (updated) {
                    return {
                        statusText: "Success"
                    };
                }
            }
            catch (error) {
            }
        },
        readNotification: async (_, { notificationId }) => {
            try {
                const updated = await prisma.notification.update({
                    where: { id: notificationId },
                    data: {
                        isRead: true,
                    },
                });
                if (updated) {
                    return {
                        statusText: "Success"
                    };
                }
            }
            catch (error) {
                console.log(error);
            }
        },
        deleteNotification: async (_, { notificationId }) => {
            try {
                const updated = await prisma.notification.delete({
                    where: { id: notificationId },
                });
                if (updated) {
                    return {
                        statusText: "Success"
                    };
                }
            }
            catch (error) {
                console.log(error);
            }
        }
    },
    Subscription: {
        LocationTracking: {
            subscribe: withFilter(() => {
                const iterator = pubsub.asyncIterator([LOCATION_TRACKING]);
                return iterator;
            }, (payload, variables) => {
                if (!variables.userID)
                    return true;
                return payload.LocationTracking.userID === variables.userID;
            }),
        },
        notificationReceived: {
            subscribe: withFilter(() => {
                const iterator = pubsub.asyncIterator([NOTIFICATION_RECEIVED]);
                return iterator;
            }, (payload, variables) => {
                return payload.notificationReceived.user.id === variables.userID;
            })
        },
    }
};
