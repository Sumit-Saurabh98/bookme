import { logger } from "../config/logger.js"
import { redis } from "../config/redis.js"
import { prisma } from "../config/prisma.js"
import { BadRequestError } from "../utils/error.js"
import { config } from "../config/index.js"
export const getProfile = async (userId) => {
   logger.info("First check user in redis")

   const storedUser = await redis.get(`user:${userId}`);
   if (storedUser) {
      logger.info("Fetched user profile from redis.")
      return JSON.parse(storedUser)
   }

   logger.info("If user is not in redis, fetch it from DB")

   const userProfile = await prisma.user.findUnique({
      where: {
         id: userId
      }
   })

   if (!userProfile) {
      logger.info("User not found")
      throw new BadRequestError("User not found")
   }

   logger.info("Exclude password field from User data")
   const {password:_password, ...safeUser} = userProfile;
   logger.info("Store user profile in redis for future lookup")
   await redis.set(`user:${userId}`, JSON.stringify(safeUser), 'EX', config.REDIS_USER_TTL)
   return safeUser
}