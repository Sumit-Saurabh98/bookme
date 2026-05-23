import express from "express";
import {
     createSeat,
     deleteSeat,
     getSeatById,
     getSeatsByCoach,
     updateSeat
} from "../controllers/seat.controller.js";

const router = express.Router();

router.get("/coaches/:coachId/seats", getSeatsByCoach);
router.get("/seats/:seatId", getSeatById);
router.post("/coaches/:coachId/seats", createSeat);
router.patch("/coaches/:coachId/seats/:seatId", updateSeat);
router.delete("/coaches/:coachId/seats/:seatId", deleteSeat);

export default router;
