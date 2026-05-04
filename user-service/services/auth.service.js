import { prisma } from "../config/prisma.js";
import { sendOtpEmail, verifyOtpEmail } from "../utils/email.js";
import { BadRequestError, ConflictError } from "../utils/error.js";
import { generateAndStoreOtp, verifyOtp } from "../utils/otp.js";
import bcrypt from "bcrypt";

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
