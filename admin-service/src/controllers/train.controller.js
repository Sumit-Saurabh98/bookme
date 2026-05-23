import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError } from "../utils/error.js";
import {
     createRoute as createRouteService,
     createTrain as createTrainService,
     deleteRoute as deleteRouteService,
     deleteTrain as deleteTrainService,
     getAllTrains as getAllTrainsService,
     getTrainById as getTrainByIdService,
     replaceRoute as replaceRouteService,
     updateTrain as updateTrainService
} from "../services/train.service.js";

export const createTrain = asyncHandler(async(req, res) => {
     const { trainNumber, trainName } = req.body;

     if (!trainNumber || !trainName) {
          throw new BadRequestError("trainNumber and trainName are required");
     }

     const train = await createTrainService(req.body);

     return res.status(201).json({
          success: true,
          message: "Train added successfully",
          data: train
     });
});

export const updateTrain = asyncHandler(async(req, res) => {
     const { trainId } = req.params;

     if (!trainId) {
          throw new BadRequestError("Train id is required");
     }

     const train = await updateTrainService(trainId, req.body);

     return res.status(200).json({
          success: true,
          message: "Train updated successfully",
          data: train
     });
});

export const deleteTrain = asyncHandler(async(req, res) => {
     const { trainId } = req.params;

     if (!trainId) {
          throw new BadRequestError("Train id is required");
     }

     await deleteTrainService(trainId);

     return res.status(200).json({
          success: true,
          message: "Train deleted successfully"
     });
});

export const createRoute = asyncHandler(async(req, res) => {
     const { trainId } = req.params;
     const { stations } = req.body;

     if (!trainId || !stations) {
          throw new BadRequestError("Train id and stations are required");
     }

     if (!Array.isArray(stations) || stations.length < 2) {
          throw new BadRequestError("A route must have at least 2 stations");
     }

     const route = await createRouteService(trainId, stations);

     return res.status(201).json({
          success: true,
          message: "Route created successfully",
          data: route
     });
});

export const deleteRoute = asyncHandler(async(req, res) => {
     const { trainId } = req.params;

     if (!trainId) {
          throw new BadRequestError("Train id is required");
     }

     await deleteRouteService(trainId);

     return res.status(200).json({
          success: true,
          message: "Route deleted successfully"
     });
});

export const replaceRoute = asyncHandler(async(req, res) => {
     const { trainId } = req.params;
     const { stations } = req.body;

     if (!trainId || !stations) {
          throw new BadRequestError("Train id and stations are required");
     }

     if (!Array.isArray(stations) || stations.length < 2) {
          throw new BadRequestError("A route must have at least 2 stations");
     }

     const route = await replaceRouteService(trainId, stations);

     return res.status(200).json({
          success: true,
          message: "Route updated successfully",
          data: route
     });
});

export const getAllTrains = asyncHandler(async(req, res) => {
     const trains = await getAllTrainsService();

     return res.status(200).json({
          success: true,
          data: trains
     });
});

export const getTrainById = asyncHandler(async(req, res) => {
     const { trainId } = req.params;

     if (!trainId) {
          throw new BadRequestError("Train id is required");
     }

     const train = await getTrainByIdService(trainId);

     return res.status(200).json({
          success: true,
          data: train
     });
});
