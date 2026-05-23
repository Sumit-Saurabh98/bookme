import { prisma } from "../config/prisma.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/error.js";
import {
     assertAllowedValue,
     BERTH_TYPES,
     COACH_TYPES,
     parsePositiveInteger,
     parsePositiveNumber
} from "../utils/domainEnums.js";
import { adminProducer } from "../kafka/producer/admin.producer.js";

const coachInclude = {
     seats: { orderBy: { seatNumber: 'asc' } },
     train: true
};

const hasOwn = (object, key) => Boolean(object && Object.prototype.hasOwnProperty.call(object, key));

const rejectManagedTotalSeats = (data) => {
     if (hasOwn(data, 'totalSeats')) {
          throw new BadRequestError('totalSeats is calculated from seats and cannot be provided directly');
     }
};

const normalizeSeatCreateData = (seats = []) => {
     if (seats === undefined) {
          return [];
     }

     if (!Array.isArray(seats)) {
          throw new BadRequestError('seats must be an array');
     }

     const seenSeatNumbers = new Set();

     return seats.map((seat) => {
          if (seat.seatNumber === undefined || !seat.berthType || seat.price === undefined) {
               throw new BadRequestError('seatNumber, berthType and price are required for every seat');
          }

          assertAllowedValue('berthType', seat.berthType, BERTH_TYPES);

          const seatNumber = parsePositiveInteger('seatNumber', seat.seatNumber);

          if (seenSeatNumbers.has(seatNumber)) {
               throw new BadRequestError(`Duplicate seat number ${seatNumber} found`);
          }

          seenSeatNumbers.add(seatNumber);

          return {
               seatNumber,
               berthType: seat.berthType,
               price: parsePositiveNumber('price', seat.price)
          };
     });
};

const getTrainOrThrow = async (trainId) => {
     const train = await prisma.train.findUnique({
          where: { id: trainId }
     });

     if (!train) {
          throw new NotFoundError('Train not found');
     }

     return train;
};

export const getCoachById = async (coachId) => {
     const coach = await prisma.coach.findUnique({
          where: { id: coachId },
          include: coachInclude
     });

     if (!coach) {
          throw new NotFoundError('Coach not found');
     }

     return coach;
};

export const getCoachesByTrain = async (trainId) => {
     await getTrainOrThrow(trainId);

     return prisma.coach.findMany({
          where: { trainId },
          include: { seats: { orderBy: { seatNumber: 'asc' } } },
          orderBy: { coachNumber: 'asc' }
     });
};

export const createCoach = async (trainId, data = {}) => {
     await getTrainOrThrow(trainId);
     rejectManagedTotalSeats(data);

     if (!data.coachNumber || !data.coachType) {
          throw new BadRequestError('coachNumber and coachType are required');
     }

     assertAllowedValue('coachType', data.coachType, COACH_TYPES);

     const seats = normalizeSeatCreateData(data.seats);

     try {
          const coach = await prisma.coach.create({
               data: {
                    trainId,
                    coachNumber: data.coachNumber.trim(),
                    coachType: data.coachType,
                    totalSeats: seats.length,
                    ...(seats.length ? {
                         seats: {
                              create: seats
                         }
                    } : {})
               },
               include: coachInclude
          });

          await adminProducer.publishCoachCreated(coach);
          return coach;
     } catch (error) {
          if (error?.code === 'P2002') {
               throw new ConflictError('Coach number already exists for this train');
          }
          throw error;
     }
};

export const updateCoach = async (trainId, coachId, data = {}) => {
     const coach = await getCoachById(coachId);
     rejectManagedTotalSeats(data);

     if (coach.trainId !== trainId) {
          throw new NotFoundError('Coach not found for this train');
     }

     if (hasOwn(data, 'coachType')) {
          assertAllowedValue('coachType', data.coachType, COACH_TYPES);
     }

     try {
          const updatedCoach = await prisma.$transaction(async (tx) => {
               const coachData = {
                    ...(data.coachNumber ? { coachNumber: data.coachNumber.trim() } : {}),
                    ...(data.coachType ? { coachType: data.coachType } : {})
               };

               if (Object.keys(coachData).length) {
                    await tx.coach.update({
                         where: { id: coachId },
                         data: coachData
                    });
               }

               const totalSeats = await tx.seat.count({
                    where: { coachId }
               });

               return tx.coach.update({
                    where: { id: coachId },
                    data: { totalSeats },
                    include: coachInclude
               });
          });

          await adminProducer.publishCoachUpdated(updatedCoach);
          return updatedCoach;
     } catch (error) {
          if (error?.code === 'P2002') {
               throw new ConflictError('Coach number already exists for this train');
          }
          throw error;
     }
};

export const deleteCoach = async (trainId, coachId) => {
     const coach = await getCoachById(coachId);

     if (coach.trainId !== trainId) {
          throw new NotFoundError('Coach not found for this train');
     }

     const deletedCoach = await prisma.coach.delete({
          where: { id: coachId }
     });

     await adminProducer.publishCoachDeleted(coach);
     return deletedCoach;
};
