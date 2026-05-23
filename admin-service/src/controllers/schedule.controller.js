import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError } from "../utils/error.js";
import {
     activateSchedule as activateScheduleService,
     cancelSchedule as cancelScheduleService,
     createSchedule as createScheduleService,
     getAllSchedules as getAllSchedulesService,
     getScheduleById as getScheduleByIdService
} from "../services/schedule.service.js";

export const createSchedule = asyncHandler(async(req, res) => {
     const { trainId, departureDate } = req.body;

     if (!trainId || !departureDate) {
          throw new BadRequestError('trainId and departureDate are required');
     }

     const schedule = await createScheduleService({ trainId, departureDate });

     return res.status(201).json({
          success: true,
          message: "Train schedule created successfully",
          data: schedule
     });
});

export const cancelSchedule = asyncHandler(async(req, res) => {
     const { scheduleId } = req.params;

     if (!scheduleId) {
          throw new BadRequestError("Schedule id is required");
     }

     const schedule = await cancelScheduleService(scheduleId);

     return res.status(200).json({
          success: true,
          message: "Schedule cancelled successfully",
          data: schedule
     });
});

export const activateSchedule = asyncHandler(async(req, res) => {
     const { scheduleId } = req.params;

     if (!scheduleId) {
          throw new BadRequestError("Schedule id is required");
     }

     const schedule = await activateScheduleService(scheduleId);

     return res.status(200).json({
          success: true,
          message: "Schedule activated successfully",
          data: schedule
     });
});

export const getAllSchedules = asyncHandler(async(req, res) => {
     const schedules = await getAllSchedulesService(req.query);

     return res.status(200).json({
          success: true,
          data: schedules
     });
});

export const getScheduleById = asyncHandler(async(req, res) => {
     const { scheduleId } = req.params;

     if (!scheduleId) {
          throw new BadRequestError("Schedule id is required");
     }

     const schedule = await getScheduleByIdService(scheduleId);

     return res.status(200).json({
          success: true,
          data: schedule
     });
});
