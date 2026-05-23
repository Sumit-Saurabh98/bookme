import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { ConflictError, NotFoundError } from "../utils/error.js";
import { adminProducer } from "../kafka/producer/admin.producer.js";

const normalizeStationData = (data, partial = false) => {
     const stationData = {};

     if (!partial || data.name !== undefined) {
          stationData.name = data.name?.trim();
     }
     if (!partial || data.code !== undefined) {
          stationData.code = data.code?.trim().toUpperCase();
     }
     if (!partial || data.city !== undefined) {
          stationData.city = data.city?.trim();
     }
     if (!partial || data.state !== undefined) {
          stationData.state = data.state?.trim() || null;
     }

     return stationData;
};

export const createStation = async (data) => {
     const stationData = normalizeStationData(data);

     const existing = await prisma.station.findUnique({
          where: { code: stationData.code }
     });

     if (existing) {
          throw new ConflictError('Station code already exists');
     }

     const station = await prisma.station.create({
          data: stationData
     });

     logger.info('Station Created', { id: station.id, code: station.code });

     await adminProducer.publishStationCreated(station).catch((err) => {
          logger.error('Failed to publish station created event', { error: err.message });
     });

     return station;
}

export const getAllStations = async (page, limit, search) => {
     const skip = (page - 1) * limit;

     const where = search ? {
          OR: [
               { code: { contains: search, mode: 'insensitive' } },
               { name: { contains: search, mode: 'insensitive' } },
               { city: { contains: search, mode: 'insensitive' } }
          ]
     } : {};

     const [stations, total] = await Promise.all([
          prisma.station.findMany({
               where,
               skip,
               take: limit,
               orderBy: { name: 'asc' }
          }),
          prisma.station.count({ where })
     ]);

     return { stations, total };
};

export const getStationById = async (stationId) => {
     const station = await prisma.station.findUnique({
          where: { id: stationId }
     });

     if (!station) {
          throw new NotFoundError('Station not found');
     }

     return station;
};

export const updateStation = async (stationId, data) => {
     await getStationById(stationId);

     const updateData = normalizeStationData(data, true);

     try {
          const station = await prisma.station.update({
               where: { id: stationId },
               data: updateData
          });

          await adminProducer.publishStationUpdated(station).catch((err) => {
               logger.error('Failed to publish station updated event', { error: err.message });
          });

          return station;
     } catch (error) {
          if (error?.code === 'P2002') {
               throw new ConflictError('Station name or code already exists');
          }
          throw error;
     }
}

export const deleteStation = async (stationId) => {
     const station = await getStationById(stationId);

     const deletedStation = await prisma.station.delete({
          where: { id: stationId }
     });

     await adminProducer.publishStationDeleted(station).catch((err) => {
          logger.error('Failed to publish station deleted event', { error: err.message });
     });

     return deletedStation;
}
