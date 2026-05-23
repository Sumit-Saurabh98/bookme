import express from "express";
import {
     createStation,
     deleteStation,
     getAllStations,
     getStationById,
     updateStation
} from "../controllers/station.controller.js";

const router = express.Router();

router.get("/", getAllStations);
router.get("/:stationId", getStationById);
router.post("/", createStation);
router.patch("/:stationId", updateStation);
router.delete("/:stationId", deleteStation);

export default router;
