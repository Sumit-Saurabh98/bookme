import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError } from "../utils/error.js";
import {
     createStation as createStationService,
     deleteStation as deleteStationService,
     getAllStations as getAllStationsService,
     getStationById as getStationByIdService,
     updateStation as updateStationService
} from "../services/station.service.js";

export const createStation = asyncHandler(async (req, res) => {
     const { name, code, city } = req.body;

     if (!name || !code || !city) {
          throw new BadRequestError('name, code and city are required');
     }

     const station = await createStationService(req.body);

     return res.status(201).json({
          success: true,
          message: 'Station created successfully',
          data: station
     });
});

export const getAllStations = asyncHandler(async (req, res) => {
     const page = Number(req.query.page) || 1;
     const limit = Number(req.query.limit) || 50;
     const search = req.query.search;

     const result = await getAllStationsService(page, limit, search);

     return res.status(200).json({
          success: true,
          data: result.stations,
          pagination: {
               page,
               limit,
               total: result.total,
               totalPages: Math.ceil(result.total / limit)
          }
     });
});

export const getStationById = asyncHandler(async (req, res) => {
     const { stationId } = req.params;
     if (!stationId) {
          throw new BadRequestError("Station id is required");
     }

     const station = await getStationByIdService(stationId);

     return res.status(200).json({
          success: true,
          data: station
     });
});

export const updateStation = asyncHandler(async (req, res) => {
     const { stationId } = req.params;
     if (!stationId) {
          throw new BadRequestError("Station id is required");
     }

     const station = await updateStationService(stationId, req.body);

     return res.status(200).json({
          success: true,
          message: 'Station updated successfully',
          data: station
     });
});

export const deleteStation = asyncHandler(async (req, res) => {
     const { stationId } = req.params;
     if (!stationId) {
          throw new BadRequestError("Station id is required");
     }

     await deleteStationService(stationId);

     return res.status(200).json({
          success: true,
          message: 'Station deleted successfully'
     });
});
