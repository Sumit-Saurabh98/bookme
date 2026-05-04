import { config } from "../config/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError } from "../utils/error.js";
import { sendOTP, verifyOTP } from "../services/auth.service.js";

export const sendOtp = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;
  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    throw new BadRequestError("All fields are required");
  }

  if (password !== confirmPassword) {
    throw new BadRequestError("Password mismatch");
  }

  const otpSessionId = await sendOTP(firstName, lastName, email, password);

  res
    .cookie("otp_session", otpSessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: config.OTP_TTL * 1000,
    })
    .status(200)
    .json({ success: true, message: "Otp sent successfully" });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const otpSessionId = req.cookies.otp_session;

  if (!otp || !otpSessionId) {
    throw new BadRequestError("Otp and session not found");
  }

  const user = await verifyOTP(otp, otpSessionId);

  return res
    .status(201)
    .json({
      success: true,
      message: "User Account created successfully",
      data: user,
    });
});
