import express from "express";
import { login, rotateRefreshToken, sendOtp, verifyOtp } from '../controllers/auth.controller.js';

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp)
router.post("/login", login);
router.get("/refresh", rotateRefreshToken);

export default router;