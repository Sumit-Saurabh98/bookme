import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError } from "../utils/error.js";
import {
     createCoach as createCoachService,
     deleteCoach as deleteCoachService,
     getCoachById as getCoachByIdService,
     getCoachesByTrain as getCoachesByTrainService,
     updateCoach as updateCoachService
} from "../services/coach.service.js";

export const getCoachesByTrain = asyncHandler(async (req, res) => {
     const { trainId } = req.params;
     const coaches = await getCoachesByTrainService(trainId);

     return res.status(200).json({
          success: true,
          data: coaches
     });
});

export const getCoachById = asyncHandler(async (req, res) => {
     const { coachId } = req.params;
     const coach = await getCoachByIdService(coachId);

     return res.status(200).json({
          success: true,
          data: coach
     });
});

export const createCoach = asyncHandler(async (req, res) => {
     const { trainId } = req.params;

     if (!trainId) {
          throw new BadRequestError('Train id is required');
     }

     const coach = await createCoachService(trainId, req.body);

     return res.status(201).json({
          success: true,
          message: 'Coach created successfully',
          data: coach
     });
});

export const updateCoach = asyncHandler(async (req, res) => {
     const { trainId, coachId } = req.params;

     if (!trainId || !coachId) {
          throw new BadRequestError('Train id and coach id are required');
     }

     const coach = await updateCoachService(trainId, coachId, req.body);

     return res.status(200).json({
          success: true,
          message: 'Coach updated successfully',
          data: coach
     });
});

export const deleteCoach = asyncHandler(async (req, res) => {
     const { trainId, coachId } = req.params;

     if (!trainId || !coachId) {
          throw new BadRequestError('Train id and coach id are required');
     }

     await deleteCoachService(trainId, coachId);

     return res.status(200).json({
          success: true,
          message: 'Coach deleted successfully'
     });
});
