import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError } from "../utils/error.js";
import {
     deleteRouteById as deleteRouteByIdService,
     getAllRoutes as getAllRoutesService,
     getRouteById as getRouteByIdService
} from "../services/route.service.js";

export const getAllRoutes = asyncHandler(async (req, res) => {
     const routes = await getAllRoutesService();

     return res.status(200).json({
          success: true,
          data: routes
     });
});

export const getRouteById = asyncHandler(async (req, res) => {
     const { routeId } = req.params;

     if (!routeId) {
          throw new BadRequestError('Route id is required');
     }

     const route = await getRouteByIdService(routeId);

     return res.status(200).json({
          success: true,
          data: route
     });
});

export const deleteRouteById = asyncHandler(async (req, res) => {
     const { routeId } = req.params;

     if (!routeId) {
          throw new BadRequestError('Route id is required');
     }

     await deleteRouteByIdService(routeId);

     return res.status(200).json({
          success: true,
          message: 'Route deleted successfully'
     });
});
