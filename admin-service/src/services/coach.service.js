import { prisma } from "../config/prisma.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/error.js";
import { adminProducer } from "../kafka/producer/admin.producer.js";

const coachInclude = {
     seats: { orderBy: { seatNumber: 'asc' } },
     train: true
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

export const createCoach = async (trainId, data) => {
     await getTrainOrThrow(trainId);

     if (!data.coachNumber || !data.coachType || !data.totalSeats) {
          throw new BadRequestError('coachNumber, coachType and totalSeats are required');
     }

     try {
          const coach = await prisma.coach.create({
               data: {
                    trainId,
                    coachNumber: data.coachNumber.trim(),
                    coachType: data.coachType,
                    totalSeats: Number(data.totalSeats),
                    ...(Array.isArray(data.seats) && data.seats.length ? {
                         seats: {
                              create: data.seats.map((seat) => ({
                                   seatNumber: Number(seat.seatNumber),
                                   berthType: seat.berthType,
                                   price: Number(seat.price)
                              }))
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

export const updateCoach = async (trainId, coachId, data) => {
     const coach = await getCoachById(coachId);

     if (coach.trainId !== trainId) {
          throw new NotFoundError('Coach not found for this train');
     }

     try {
          const updatedCoach = await prisma.coach.update({
               where: { id: coachId },
               data: {
                    ...(data.coachNumber ? { coachNumber: data.coachNumber.trim() } : {}),
                    ...(data.coachType ? { coachType: data.coachType } : {}),
                    ...(data.totalSeats !== undefined ? { totalSeats: Number(data.totalSeats) } : {})
               },
               include: coachInclude
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
