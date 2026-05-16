import express from "express";
import { login, rotateRefreshToken, sendOtp, verifyGoogleIdToken, verifyOtp } from '../controllers/auth.controller.js';

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp)
router.post("/login", login);
router.post("/google-auth", verifyGoogleIdToken);
router.get("/refresh", rotateRefreshToken);
router.post("/refresh", rotateRefreshToken);

export default router;
