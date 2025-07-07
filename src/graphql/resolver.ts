import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export const resolvers = {
  Query: {
    getUsers: () => prisma.user.findMany(),
    getUser: (_: any, args: { id: number }) => prisma.user.findUnique({ where: { id: args.id } }),
    getDeliveries: () => prisma.delivery.findMany(),
    getDelivery: (_: any, args: { id: number }) =>
      prisma.delivery.findUnique({ where: { id: args.id } }),

    getVehicleTypes: () => prisma.vehicleType.findMany(),
  }

}
