import crypto from "crypto";
import { config } from "../config/index.js";
import { redis } from "../config/redis.js";
import { TooManyRequestError } from "./error.js";

const RATE_MAX = parseInt(config.OTP_RATE_MAX_PER_HOUR || "5", 10);
const ATTEMPT_MAX = parseInt(config.OTP_MAX_VERIFY_ATTEMPTS || "5", 10);
const OTP_TTL = parseInt(config.OTP_TTL || "300", 10);
const HMAC_SECRET = config.OTP_HMAC_SECRET;

function generateOtp() {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function hmacFor(email, otp) {
    return crypto
        .createHmac("sha256", HMAC_SECRET)
        .update(email + ":" + otp)
        .digest("hex");
}

export async function generateAndStoreOtp(meta) {
    const rateKey = `otp:rate:${meta.email}`;
    const sentCount = parseInt((await redis.get(rateKey)) || "0", 10);

    if (sentCount >= RATE_MAX) {
        throw new TooManyRequestError(
            "Too many OTP requests. Try again later.",
            "OTP_RATE_LIMIT"
        );
    }

    const otp = generateOtp();
    const otpSessionId = crypto.randomUUID();
    const hashed = hmacFor(meta.email, otp);

    await redis.set(
        `otp:session:${otpSessionId}`,
        JSON.stringify({ hashedOtp: hashed, meta }),
        "EX",
        OTP_TTL
    );
    await redis.incr(rateKey);
    await redis.expire(rateKey, 3600);

    return { otp, otpSessionId };
}

export async function verifyOtp(otp, otpSessionId) {
    const rawData = await redis.get(`otp:session:${otpSessionId}`);
    if (!rawData) return null;

    const { hashedOtp: storedOtp, meta } = JSON.parse(rawData);
    const attemptsKey = `otp:attempts:${meta.email}`;
    const attemptsCount = parseInt((await redis.get(attemptsKey)) || "0", 10);

    if (attemptsCount >= ATTEMPT_MAX) {
        throw new TooManyRequestError("Too many attempts to verify OTP");
    }

    const hashedOtp = hmacFor(meta.email, otp);

    if (
        crypto.timingSafeEqual(
            Buffer.from(hashedOtp, "hex"),
            Buffer.from(storedOtp, "hex")
        )
    ) {
        await redis.del(`otp:session:${otpSessionId}`, attemptsKey);
        await redis.del(`otp:rate:${meta.email}`);
        return meta;
    } else {
        await redis.incr(attemptsKey);
        await redis.expire(attemptsKey, OTP_TTL);
        return null;
    }
}
