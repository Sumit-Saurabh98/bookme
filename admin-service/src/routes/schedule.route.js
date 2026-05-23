import express from "express";
import {
     activateSchedule,
     cancelSchedule,
     createSchedule,
     getAllSchedules,
     getScheduleById
} from "../controllers/schedule.controller.js";

const router = express.Router();

router.get("/", getAllSchedules);
router.get("/:scheduleId", getScheduleById);
router.post("/", createSchedule);
router.patch("/:scheduleId/cancel", cancelSchedule);
router.patch("/:scheduleId/activate", activateSchedule);

export default router;
