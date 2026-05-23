import express from "express";
import {
     deleteRouteById,
     getAllRoutes,
     getRouteById
} from "../controllers/route.controller.js";

const router = express.Router();

router.get("/", getAllRoutes);
router.get("/:routeId", getRouteById);
router.delete("/:routeId", deleteRouteById);

export default router;
