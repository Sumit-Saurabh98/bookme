import { prisma } from "../config/prisma.js";
import { BadRequestError, ConflictError, ForbiddenError, UnAuthorizedError } from "../utils/error.js";
import { generateAndStoreOtp, verifyOtp } from "../utils/otp.js";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/auth.js"
import { redis } from "../config/redis.js";
import { config } from "../config/index.js";
import { OAuth2Client } from "google-auth-library"
import jwt from "jsonwebtoken"
import { notificationProducer } from "../kafka/producer/notification.producer.js";
import { logger } from "../config/logger.js";

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID)

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
  await notificationProducer.sendOtpEmail(email, otp, config.OTP_TTL/60)
  logger.info("Otp email queued for: ", {email})
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

  await notificationProducer.sendWelcomeEmail(meta.email, meta.firstName);
  logger.info("Welcome email queued for: ", {email: meta.email})
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

export const verifyGoogleIdToken = async (idToken, deviceId) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.GOOGLE_CLIENT_ID
  })
  const payload = ticket.getPayload();

  if (!payload.sub || !payload.email) {
    throw new UnAuthorizedError("Invalid Google Token Payload")
  }

  const googleUser = {
    provider: payload.iss,
    providerId: payload.sub,
    email: payload.email,
    firstName: payload.given_name,
    lastName: payload.family_name,
    emailVerified: payload.email_verified || false
  }


  const user = await prisma.$transaction(async (tx) => {
    let googleAuth = await tx.authProvider.findUnique({
      where: {
        provider_providerId: {
          provider: googleUser.provider,
          providerId: googleUser.providerId
        }
      },
      include: { user: true }
    })

    if (googleAuth) {
      return googleAuth.user;
    }

    let existingUser = await tx.user.findUnique({
      where: { email: googleUser.email }
    })

    if (existingUser) {
      await tx.authProvider.create({
        data: {
          provider: googleUser.provider,
          providerId: googleUser.providerId,
          userId: existingUser.id
        }
      })
      return existingUser;
    }

    return await tx.user.create({
      data: {
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        emailVerified: googleUser.emailVerified,
        AuthProviders: {
          create: {
            provider: googleUser.provider,
            providerId: googleUser.providerId
          }
        }
      }
    })
  })

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  const { jti } = jwt.decode(refreshToken);
  await redis.set(`refresh:${user.id}:${deviceId}`, jti, 'EX', config.REFRESH_TOKEN_EXP_SEC);
  const { password: _password, ...safeUser } = user;
  await redis.set(`user:${user.id}`, JSON.stringify(safeUser), 'EX', config.REDIS_USER_TTL);
  return { accessToken, refreshToken, loggedInUser: safeUser };

}
