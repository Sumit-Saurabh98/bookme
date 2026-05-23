import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/error.js";
import { adminProducer } from "../kafka/producer/admin.producer.js";

const scheduleInclude = {
     train: {
          include: {
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
          }
     }
};

const parseDepartureDate = (departureDate) => {
     const parsedDate = new Date(`${departureDate}T00:00:00.000Z`);

     if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestError('Invalid departure date format. Use YYYY-MM-DD');
     }

     return parsedDate;
};

const buildScheduleCreatedPayload = (schedule) => {
     const totalSeats = schedule.train.coaches.reduce((sum, coach) => sum + coach.totalSeats, 0);

     return {
          scheduleId: schedule.id,
          trainId: schedule.train.id,
          trainNumber: schedule.train.trainNumber,
          trainName: schedule.train.trainName,
          totalSeats,
          departureDate: schedule.departureDate,
          status: schedule.status,
          coaches: schedule.train.coaches.map((coach) => ({
               coachId: coach.id,
               coachNumber: coach.coachNumber,
               coachType: coach.coachType,
               totalSeats: coach.totalSeats,
               seats: coach.seats.map((seat) => ({
                    seatId: seat.id,
                    seatNumber: seat.seatNumber,
                    berthType: seat.berthType,
                    price: seat.price
               }))
          })),
          route: schedule.train.route.routeStations.map((routeStation) => ({
               stationId: routeStation.station.id,
               stationName: routeStation.station.name,
               stationCode: routeStation.station.code,
               city: routeStation.station.city,
               sequenceNumber: routeStation.sequenceNumber,
               arrivalTime: routeStation.arrivalTime,
               departureTime: routeStation.departureTime,
               distanceFromOrigin: routeStation.distanceFromOrigin
          }))
     };
};

export const createSchedule = async ({ trainId, departureDate }) => {
     const train = await prisma.train.findUnique({
          where: { id: trainId },
          include: scheduleInclude.train.include
     });

     if (!train) {
          throw new NotFoundError('Train not found');
     }
     if (!train.route) {
          throw new BadRequestError('Train has no route defined. Create a route first.');
     }
     if (!train.coaches.length) {
          throw new BadRequestError('Train has no coaches defined.');
     }

     const parsedDate = parseDepartureDate(departureDate);

     const existing = await prisma.schedule.findUnique({
          where: { trainId_departureDate: { trainId, departureDate: parsedDate } }
     });

     if (existing) {
          throw new ConflictError('Schedule already exists for this train on this date');
     }

     const schedule = await prisma.schedule.create({
          data: { trainId, departureDate: parsedDate },
          include: scheduleInclude
     });

     await adminProducer.publishScheduleCreated(buildScheduleCreatedPayload(schedule));
     logger.info(`Schedule created and event published for train ${train.trainNumber} on ${departureDate}`);

     return schedule;
}

export const getAllSchedules = async (query = {}) => {
     const where = {};

     if (query.trainId) {
          where.trainId = query.trainId;
     }
     if (query.status) {
          where.status = query.status;
     }
     if (query.date) {
          where.departureDate = parseDepartureDate(query.date);
     }

     return prisma.schedule.findMany({
          where,
          include: scheduleInclude,
          orderBy: { departureDate: 'asc' }
     });
};

export const getScheduleById = async (scheduleId) => {
     const schedule = await prisma.schedule.findUnique({
          where: { id: scheduleId },
          include: scheduleInclude
     });

     if (!schedule) {
          throw new NotFoundError('Schedule not found');
     }

     return schedule;
};

export const cancelSchedule = async (scheduleId) => {
     await getScheduleById(scheduleId);

     const updated = await prisma.schedule.update({
          where: { id: scheduleId },
          data: { status: 'CANCELLED' },
          include: scheduleInclude
     });

     await adminProducer.publishScheduleCancelled(updated);
     return updated;
};

export const activateSchedule = async (scheduleId) => {
     await getScheduleById(scheduleId);

     const updated = await prisma.schedule.update({
          where: { id: scheduleId },
          data: { status: 'ACTIVE' },
          include: scheduleInclude
     });

     await adminProducer.publishScheduleActivated(updated);
     return updated;
};
