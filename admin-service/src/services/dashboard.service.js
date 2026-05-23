import { prisma } from "../config/prisma.js";

export const getSummary = async () => {
     const [
          stationCount,
          trainCount,
          coachCount,
          seatCount,
          routeCount,
          activeScheduleCount,
          cancelledScheduleCount
     ] = await Promise.all([
          prisma.station.count(),
          prisma.train.count(),
          prisma.coach.count(),
          prisma.seat.count(),
          prisma.route.count(),
          prisma.schedule.count({ where: { status: 'ACTIVE' } }),
          prisma.schedule.count({ where: { status: 'CANCELLED' } })
     ]);

     return {
          stations: stationCount,
          trains: trainCount,
          coaches: coachCount,
          seats: seatCount,
          routes: routeCount,
          schedules: {
               active: activeScheduleCount,
               cancelled: cancelledScheduleCount,
               total: activeScheduleCount + cancelledScheduleCount
          }
     };
};
