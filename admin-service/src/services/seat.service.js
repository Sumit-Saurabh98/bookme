import { prisma } from "../config/prisma.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/error.js";
import {
     assertAllowedValue,
     BERTH_TYPES,
     parsePositiveInteger
} from "../utils/domainEnums.js";
import { adminProducer } from "../kafka/producer/admin.producer.js";

const seatInclude = {
     coach: {
          include: { train: true }
     }
};

const hasOwn = (object, key) => Boolean(object && Object.prototype.hasOwnProperty.call(object, key));

const getCoachOrThrow = async (coachId) => {
     const coach = await prisma.coach.findUnique({
          where: { id: coachId }
     });

     if (!coach) {
          throw new NotFoundError('Coach not found');
     }

     return coach;
};

const syncCoachTotalSeats = async (tx, coachId) => {
     const totalSeats = await tx.seat.count({
          where: { coachId }
     });

     return tx.coach.update({
          where: { id: coachId },
          data: { totalSeats },
          include: { train: true }
     });
};

export const getSeatsByCoach = async (coachId) => {
     await getCoachOrThrow(coachId);

     return prisma.seat.findMany({
          where: { coachId },
          orderBy: { seatNumber: 'asc' }
     });
};

export const getSeatById = async (seatId) => {
     const seat = await prisma.seat.findUnique({
          where: { id: seatId },
          include: seatInclude
     });

     if (!seat) {
          throw new NotFoundError('Seat not found');
     }

     return seat;
};

export const createSeat = async (coachId, data = {}) => {
     await getCoachOrThrow(coachId);
     if (hasOwn(data, 'price')) {
          throw new BadRequestError('price is managed at coach level and cannot be provided for a seat');
     }

     assertAllowedValue('berthType', data.berthType, BERTH_TYPES);
     const seatNumber = parsePositiveInteger('seatNumber', data.seatNumber);

     try {
          const seat = await prisma.$transaction(async (tx) => {
               const createdSeat = await tx.seat.create({
                    data: {
                         coachId,
                         seatNumber,
                         berthType: data.berthType
                    }
               });

               await syncCoachTotalSeats(tx, coachId);

               return tx.seat.findUnique({
                    where: { id: createdSeat.id },
                    include: seatInclude
               });
          });

          await adminProducer.publishSeatCreated(seat);
          return seat;
     } catch (error) {
          if (error?.code === 'P2002') {
               throw new ConflictError('Seat number already exists for this coach');
          }
          throw error;
     }
};

export const updateSeat = async (coachId, seatId, data = {}) => {
     const seat = await getSeatById(seatId);

     if (hasOwn(data, 'seatNumber')) {
          throw new BadRequestError('seatNumber cannot be changed after a seat is created');
     }

     if (hasOwn(data, 'price')) {
          throw new BadRequestError('price is managed at coach level and cannot be updated on a seat');
     }

     if (hasOwn(data, 'berthType')) {
          assertAllowedValue('berthType', data.berthType, BERTH_TYPES);
     }

     if (seat.coachId !== coachId) {
          throw new NotFoundError('Seat not found for this coach');
     }

     try {
          const updatedSeat = await prisma.seat.update({
               where: { id: seatId },
               data: {
                    ...(data.berthType ? { berthType: data.berthType } : {})
               },
               include: seatInclude
          });

          await adminProducer.publishSeatUpdated(updatedSeat);
          return updatedSeat;
     } catch (error) {
          if (error?.code === 'P2002') {
               throw new ConflictError('Seat number already exists for this coach');
          }
          throw error;
     }
};

export const deleteSeat = async (coachId, seatId) => {
     const seat = await getSeatById(seatId);

     if (seat.coachId !== coachId) {
          throw new NotFoundError('Seat not found for this coach');
     }

     const deletedSeat = await prisma.$transaction(async (tx) => {
          const deleted = await tx.seat.delete({
               where: { id: seatId }
          });

          const updatedCoach = await syncCoachTotalSeats(tx, coachId);

          return {
               ...seat,
               ...deleted,
               coach: updatedCoach
          };
     });

     await adminProducer.publishSeatDeleted(deletedSeat);
     return deletedSeat;
};
