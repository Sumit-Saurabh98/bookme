import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError } from "../utils/error.js";
import {
     createSeat as createSeatService,
     deleteSeat as deleteSeatService,
     getSeatById as getSeatByIdService,
     getSeatsByCoach as getSeatsByCoachService,
     updateSeat as updateSeatService
} from "../services/seat.service.js";

export const getSeatsByCoach = asyncHandler(async (req, res) => {
     const { coachId } = req.params;
     const seats = await getSeatsByCoachService(coachId);

     return res.status(200).json({
          success: true,
          data: seats
     });
});

export const getSeatById = asyncHandler(async (req, res) => {
     const { seatId } = req.params;
     const seat = await getSeatByIdService(seatId);

     return res.status(200).json({
          success: true,
          data: seat
     });
});

export const createSeat = asyncHandler(async (req, res) => {
     const { coachId } = req.params;
     const { seatNumber, berthType, price } = req.body;

     if (!coachId || seatNumber === undefined || !berthType || price === undefined) {
          throw new BadRequestError('coachId, seatNumber, berthType and price are required');
     }

     const seat = await createSeatService(coachId, req.body);

     return res.status(201).json({
          success: true,
          message: 'Seat created successfully',
          data: seat
     });
});

export const updateSeat = asyncHandler(async (req, res) => {
     const { coachId, seatId } = req.params;

     if (!coachId || !seatId) {
          throw new BadRequestError('Coach id and seat id are required');
     }

     const seat = await updateSeatService(coachId, seatId, req.body);

     return res.status(200).json({
          success: true,
          message: 'Seat updated successfully',
          data: seat
     });
});

export const deleteSeat = asyncHandler(async (req, res) => {
     const { coachId, seatId } = req.params;

     if (!coachId || !seatId) {
          throw new BadRequestError('Coach id and seat id are required');
     }

     await deleteSeatService(coachId, seatId);

     return res.status(200).json({
          success: true,
          message: 'Seat deleted successfully'
     });
});
