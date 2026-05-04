import { config } from "../config/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError, UnAuthorizedError } from "../utils/error.js";
import { sendOTP, verifyOTP } from "../services/auth.service.js";
import { getDeviceFingerPrint } from "../utils/deviceFingerprint.js"
import { login as loginService, rotateRefreshToken as rotateRefreshTokenService } from "../services/auth.service.js"

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

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError("Email and Password are required")
  }

  const deviceId = getDeviceFingerPrint(req);
  const { accessToken, refreshToken, loggedInUser } = await loginService(email, password, deviceId)
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: config.ACCESS_TOKEN_EXP_SEC * 1000
  })

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: config.REFRESH_TOKEN_EXP_SEC * 1000
  }).status(200).json({
    success: true,
    message: "Logged in successfully",
    loggedInUser
  })
})

export const rotateRefreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new UnAuthorizedError("Refresh token is missing", "LOGIN AGAIN")
  }

  const deviceId = getDeviceFingerPrint(req);
  const { newAccessToken, newRefreshToken } = await rotateRefreshTokenService(refreshToken, deviceId)
  res.cookie("accessToken", newAccessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: config.ACCESS_TOKEN_EXP_SEC * 1000
  })
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: config.REFRESH_TOKEN_EXP_SEC * 1000
  }).status(200).json({
    success: true,
    message: "Access and Refresh token reissued"
  })
})
