import express from "express";
import {
     createCoach,
     deleteCoach,
     getCoachById,
     getCoachesByTrain,
     updateCoach
} from "../controllers/coach.controller.js";

const router = express.Router();

router.get("/trains/:trainId/coaches", getCoachesByTrain);
router.get("/coaches/:coachId", getCoachById);
router.post("/trains/:trainId/coaches", createCoach);
router.patch("/trains/:trainId/coaches/:coachId", updateCoach);
router.delete("/trains/:trainId/coaches/:coachId", deleteCoach);

export default router;
