import express from "express"
import { requireAuth } from '../middlewares/auth.middleware.js';
import { deleteProfile, getProfile, updateProfile } from "../controllers/user.controller.js"


const router = express.Router();

router.get("/get-profile", requireAuth, getProfile);
router.patch("/update-profile", requireAuth, updateProfile);
router.delete("/delete-profile", requireAuth, deleteProfile);

export default router
