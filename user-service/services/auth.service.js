import { prisma } from "../config/prisma.js";
import { sendOtpEmail, verifyOtpEmail } from "../utils/email.js";
import { BadRequestError, ConflictError, ForbiddenError } from "../utils/error.js";
import { generateAndStoreOtp, verifyOtp } from "../utils/otp.js";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/auth.js"
import { redis } from "../config/redis.js";
import { config } from "../config/index.js";
import jwt from "jsonwebtoken"

export const sendOTP = async (firstName, lastName, email, password) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError("User already exist");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const meta = { firstName, lastName, email, hashedPassword };

  const { otp, otpSessionId } = await generateAndStoreOtp(meta);
  await sendOtpEmail(email, otp);
  return otpSessionId;
};

export const verifyOTP = async (otp, otpSessionId) => {
  const meta = await verifyOtp(otp, otpSessionId);

  if (meta === null) {
    throw new BadRequestError("Invalid or expired otp", "INVALID_OTP");
  }

  const user = await prisma.user.create({
    data: {
      firstName: meta.firstName,
      lastName: meta.lastName,
      email: meta.email,
      password: meta.hashedPassword,
      emailVerified: true,
    },
  });

  await verifyOtpEmail(meta);
  return user;
};

export const login = async (email, password, deviceId) => {
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (!existingUser) {
    throw new BadRequestError("Email not found")
  }

  const doesPasswordMatch = await bcrypt.compare(password, existingUser.password)

  if (!doesPasswordMatch) {
    throw new BadRequestError("Incorrect password")
  }

  const accessToken = generateAccessToken(existingUser.id)
  const refreshToken = generateRefreshToken(existingUser.id)

  const { jti } = jwt.decode(refreshToken)
  await redis.set(`refresh:${existingUser.id}:${deviceId}`, jti, 'EX', config.REFRESH_TOKEN_EXP_SEC)

  const { password: _password, ...safeUser } = existingUser

  await redis.set(`user:${existingUser.id}`, JSON.stringify(safeUser), 'EX', config.REDIS_USER_TTL)

  return { accessToken, refreshToken, loggedInUser: safeUser }
}

export const rotateRefreshToken = async (refreshToken, deviceId) => {
  const payload = verifyRefreshToken(refreshToken)

  const { id: userId, jti } = payload

  const storedJti = await redis.get(`refresh:${userId}:${deviceId}`)

  if (storedJti !== jti) {
    await redis.del(`refresh:${userId}:${deviceId}`)
    throw new ForbiddenError("Refreshed token reused", "LOGIN AGAIN")
  }

  const newAccessToken = generateAccessToken(payload.id)
  const newRefreshToken = generateRefreshToken(payload.id)

  const { jti: newJti } = jwt.decode(newRefreshToken)
  await redis.set(`refresh:${payload.id}:${deviceId}`, newJti, 'EX', config.REFRESH_TOKEN_EXP_SEC)

  return { newAccessToken, newRefreshToken }
}
