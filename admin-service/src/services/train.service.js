import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/error.js";
import {
     assertAllowedValue,
     BERTH_TYPES,
     COACH_TYPES,
     parsePositiveInteger,
     parsePositiveNumber
} from "../utils/domainEnums.js";
import { adminProducer } from "../kafka/producer/admin.producer.js";

const trainInclude = {
     coaches: {
          include: {
               seats: { orderBy: { seatNumber: 'asc' } }
          },
          orderBy: { coachNumber: 'asc' }
     },
     route: {
          include: {
               routeStations: {
                    include: { station: true },
                    orderBy: { sequenceNumber: 'asc' }
               }
          }
     }
};

const routeInclude = {
     routeStations: {
          include: { station: true },
          orderBy: { sequenceNumber: 'asc' }
     }
};

const hasOwn = (object, key) => Boolean(object && Object.prototype.hasOwnProperty.call(object, key));

const validateCoaches = (coaches = []) => {
     if (!Array.isArray(coaches)) {
          throw new BadRequestError('coaches must be an array');
     }

     for (const coach of coaches) {
          if (hasOwn(coach, 'totalSeats')) {
               const coachLabel = coach.coachNumber ? ` for coach ${coach.coachNumber}` : '';
               throw new BadRequestError(`totalSeats is calculated from seats and cannot be provided${coachLabel}`);
          }

          if (!coach.coachNumber || !coach.coachType) {
               throw new BadRequestError('coachNumber and coachType are required for every coach');
          }

          assertAllowedValue('coachType', coach.coachType, COACH_TYPES);

          if (!Array.isArray(coach.seats) || !coach.seats.length) {
               throw new BadRequestError('Every coach must have at least one seat');
          }

          for (const seat of coach.seats) {
               if (seat.seatNumber === undefined || !seat.berthType || seat.price === undefined) {
                    throw new BadRequestError(`seatNumber, berthType and price are required for every seat in coach ${coach.coachNumber}`);
               }

               assertAllowedValue('berthType', seat.berthType, BERTH_TYPES);
          }

          const seatNumbers = coach.seats.map((seat) => parsePositiveInteger('seatNumber', seat.seatNumber));
          if (new Set(seatNumbers).size !== seatNumbers.length) {
               throw new BadRequestError(`Duplicate seat numbers found in coach ${coach.coachNumber}`);
          }
     }
};

const validateRouteStations = async (stations) => {
     const stationIds = stations.map((station) => station.stationId);
     const existingStations = await prisma.station.findMany({
          where: { id: { in: stationIds } }
     });

     if (existingStations.length !== stationIds.length) {
          throw new BadRequestError('One or more station IDs are invalid');
     }

     const sorted = [...stations].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
     for (let index = 0; index < sorted.length; index += 1) {
          if (Number(sorted[index].sequenceNumber) !== index + 1) {
               throw new BadRequestError('Sequence numbers must be continuous starting from 1');
          }
     }

     return sorted;
};

const routeStationCreateData = (stations) => stations.map((station) => ({
     stationId: station.stationId,
     sequenceNumber: Number(station.sequenceNumber),
     arrivalTime: station.arrivalTime || null,
     departureTime: station.departureTime || null,
     distanceFromOrigin: Number(station.distanceFromOrigin || 0)
}));

export const createTrain = async (data = {}) => {
     const { trainNumber, trainName, coaches = [] } = data;

     const existing = await prisma.train.findUnique({
          where: { trainNumber }
     });

     if (existing) {
          throw new ConflictError("Train with this number already exists");
     }

     validateCoaches(coaches);

     const trainData = {
          trainNumber: trainNumber.trim(),
          trainName: trainName.trim()
     };

     if (coaches.length) {
          trainData.coaches = {
               create: coaches.map((coach) => ({
                         coachNumber: coach.coachNumber.trim(),
                         coachType: coach.coachType,
                         totalSeats: coach.seats.length,
                         seats: {
                              create: coach.seats.map((seat) => ({
                                   seatNumber: parsePositiveInteger('seatNumber', seat.seatNumber),
                                   berthType: seat.berthType,
                                   price: parsePositiveNumber('price', seat.price)
                              }))
                         }
                    }))
          };
     }

     const train = await prisma.train.create({
          data: trainData,
          include: trainInclude
     });

     await adminProducer.publishTrainCreated(train).catch((err) => {
          logger.error('Failed to publish train created event', { error: err.message });
     });

     return train;
}

export const updateTrain = async (trainId, data) => {
     await getTrainById(trainId);

     try {
          const train = await prisma.train.update({
               where: { id: trainId },
               data: {
                    ...(data.trainNumber ? { trainNumber: data.trainNumber.trim() } : {}),
                    ...(data.trainName ? { trainName: data.trainName.trim() } : {})
               },
               include: trainInclude
          });

          await adminProducer.publishTrainUpdated(train).catch((err) => {
               logger.error('Failed to publish train updated event', { error: err.message });
          });

          return train;
     } catch (error) {
          if (error?.code === 'P2002') {
               throw new ConflictError('Train number already exists');
          }
          throw error;
     }
}

export const deleteTrain = async (trainId) => {
     const train = await getTrainById(trainId);

     const deletedTrain = await prisma.train.delete({
          where: { id: trainId }
     });

     await adminProducer.publishTrainDeleted(train).catch((err) => {
          logger.error('Failed to publish train deleted event', { error: err.message });
     });

     return deletedTrain;
}

export const createRoute = async (trainId, stations) => {
     const train = await prisma.train.findUnique({
          where: { id: trainId }
     });

     if (!train) {
          throw new NotFoundError('Train not found');
     }

     const existingRoute = await prisma.route.findUnique({
          where: { trainId }
     });

     if (existingRoute) {
          throw new ConflictError("Route already exists for this train");
     }

     const sorted = await validateRouteStations(stations);

     const route = await prisma.route.create({
          data: {
               trainId,
               routeStations: {
                    create: routeStationCreateData(sorted)
               }
          },
          include: routeInclude
     });

     await adminProducer.publishRouteCreated(route).catch((err) => {
          logger.error('Failed to publish route created event', { error: err.message });
     });

     return route;
};

export const replaceRoute = async (trainId, stations) => {
     const train = await prisma.train.findUnique({
          where: { id: trainId }
     });

     if (!train) {
          throw new NotFoundError('Train not found');
     }

     const sorted = await validateRouteStations(stations);

     const route = await prisma.$transaction(async (tx) => {
          await tx.route.deleteMany({
               where: { trainId }
          });

          return tx.route.create({
               data: {
                    trainId,
                    routeStations: {
                         create: routeStationCreateData(sorted)
                    }
               },
               include: routeInclude
          });
     });

     await adminProducer.publishRouteUpdated(route).catch((err) => {
          logger.error('Failed to publish route updated event', { error: err.message });
     });

     return route;
};

export const deleteRoute = async (trainId) => {
     const route = await prisma.route.findUnique({
          where: { trainId },
          include: routeInclude
     });

     if (!route) {
          throw new NotFoundError('Route not found');
     }

     const deletedRoute = await prisma.route.delete({
          where: { trainId }
     });

     await adminProducer.publishRouteDeleted(route).catch((err) => {
          logger.error('Failed to publish route deleted event', { error: err.message });
     });

     return deletedRoute;
};

export const getAllTrains = async () => {
     return prisma.train.findMany({
          include: trainInclude,
          orderBy: { trainNumber: 'asc' }
     });
};

export const getTrainById = async (trainId) => {
     const train = await prisma.train.findUnique({
          where: { id: trainId },
          include: trainInclude
     });

     if (!train) {
          throw new NotFoundError('Train not found');
     }

     return train;
};
