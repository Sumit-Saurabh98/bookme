import express from "express"
import { deleteProfile, getProfile, updateProfile } from "../controllers/user.controller.js"
import { getUserContext } from "../middlewares/getUserContext.middleware.js";


const router = express.Router();

router.get("/get-profile", getUserContext, getProfile);
router.patch("/update-profile", getUserContext, updateProfile);
router.delete("/delete-profile", getUserContext, deleteProfile);

export default router
