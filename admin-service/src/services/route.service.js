import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { NotFoundError } from "../utils/error.js";
import { adminProducer } from "../kafka/producer/admin.producer.js";

const routeInclude = {
     train: true,
     routeStations: {
          include: { station: true },
          orderBy: { sequenceNumber: 'asc' }
     }
};

export const getAllRoutes = async () => {
     return prisma.route.findMany({
          include: routeInclude,
          orderBy: {
               train: {
                    trainNumber: 'asc'
               }
          }
     });
};

export const getRouteById = async (routeId) => {
     const route = await prisma.route.findUnique({
          where: { id: routeId },
          include: routeInclude
     });

     if (!route) {
          throw new NotFoundError('Route not found');
     }

     return route;
};

export const deleteRouteById = async (routeId) => {
     const route = await getRouteById(routeId);

     const deletedRoute = await prisma.route.delete({
          where: { id: routeId }
     });

     await adminProducer.publishRouteDeleted(route).catch((err) => {
          logger.error('Failed to publish route deleted event', { error: err.message });
     });

     return deletedRoute;
};
