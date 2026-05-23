import express from "express";
import {
     createRoute,
     createTrain,
     deleteRoute,
     deleteTrain,
     getAllTrains,
     getTrainById,
     replaceRoute,
     updateTrain
} from "../controllers/train.controller.js";

const router = express.Router();

router.get("/", getAllTrains);
router.get("/:trainId", getTrainById);
router.post("/", createTrain);
router.patch("/:trainId", updateTrain);
router.delete("/:trainId", deleteTrain);

router.post("/:trainId/route", createRoute);
router.put("/:trainId/route", replaceRoute);
router.delete("/:trainId/route", deleteRoute);

export default router;
