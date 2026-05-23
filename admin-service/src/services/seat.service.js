import { prisma } from "../config/prisma.js";
import { ConflictError, NotFoundError } from "../utils/error.js";
import { adminProducer } from "../kafka/producer/admin.producer.js";

const seatInclude = {
     coach: {
          include: { train: true }
     }
};

const getCoachOrThrow = async (coachId) => {
     const coach = await prisma.coach.findUnique({
          where: { id: coachId }
     });

     if (!coach) {
          throw new NotFoundError('Coach not found');
     }

     return coach;
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

export const createSeat = async (coachId, data) => {
     await getCoachOrThrow(coachId);

     try {
          const seat = await prisma.seat.create({
               data: {
                    coachId,
                    seatNumber: Number(data.seatNumber),
                    berthType: data.berthType,
                    price: Number(data.price)
               },
               include: seatInclude
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

export const updateSeat = async (coachId, seatId, data) => {
     const seat = await getSeatById(seatId);

     if (seat.coachId !== coachId) {
          throw new NotFoundError('Seat not found for this coach');
     }

     try {
          const updatedSeat = await prisma.seat.update({
               where: { id: seatId },
               data: {
                    ...(data.seatNumber !== undefined ? { seatNumber: Number(data.seatNumber) } : {}),
                    ...(data.berthType ? { berthType: data.berthType } : {}),
                    ...(data.price !== undefined ? { price: Number(data.price) } : {})
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

     const deletedSeat = await prisma.seat.delete({
          where: { id: seatId }
     });

     await adminProducer.publishSeatDeleted(seat);
     return deletedSeat;
};
