import { logger } from "../config/logger.js"
import { redis } from "../config/redis.js"
import { prisma } from "../config/prisma.js"
import { BadRequestError, ConflictError, NotFoundError } from "../utils/error.js"
import { config } from "../config/index.js"

const EDITABLE_PROFILE_FIELDS = ["firstName", "lastName", "email"]
const hasOwn = (object, field) => Object.prototype.hasOwnProperty.call(object, field)

const removePassword = (user) => {
   const {password:_password, ...safeUser} = user
   return safeUser
}

const deleteRefreshTokens = async (userId) => {
   let cursor = "0"
   do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `refresh:${userId}:*`, "COUNT", 100)
      if (keys.length) {
         await redis.del(...keys)
      }
      cursor = nextCursor
   } while (cursor !== "0")
}

const deleteUserCache = async (userId) => {
   await redis.del(`user:${userId}`)
}

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
   const safeUser = removePassword(userProfile);
   logger.info("Store user profile in redis for future lookup")
   await redis.set(`user:${userId}`, JSON.stringify(safeUser), 'EX', config.REDIS_USER_TTL)
   return safeUser
}

export const updateProfile = async(userId, profileData = {})=>{
   if (!userId) {
      throw new BadRequestError("User id is required")
   }

   if (!profileData || typeof profileData !== "object" || Array.isArray(profileData)) {
      throw new BadRequestError("Profile data is required")
   }

   const existingUser = await prisma.user.findUnique({
      where: { id: userId }
   })

   if (!existingUser) {
      throw new NotFoundError("User not found")
   }

   const updateData = {}

   for (const field of EDITABLE_PROFILE_FIELDS) {
      if (!hasOwn(profileData, field)) {
         continue
      }

      const value = profileData[field]
      if (typeof value !== "string" || !value.trim()) {
         throw new BadRequestError(`${field} is required`)
      }

      updateData[field] = value.trim()
   }

   if (!Object.keys(updateData).length) {
      throw new BadRequestError("At least one profile field is required")
   }

   if (updateData.email && updateData.email !== existingUser.email) {
      updateData.emailVerified = false
   }

   try {
      const updatedUser = await prisma.user.update({
         where: { id: userId },
         data: updateData
      })

      const safeUser = removePassword(updatedUser)
      await redis.set(`user:${userId}`, JSON.stringify(safeUser), 'EX', config.REDIS_USER_TTL)
      return safeUser
   } catch (error) {
      if (error?.code === "P2002") {
         throw new ConflictError("Email already exists")
      }
      throw error
   }
}

export const deleteProfile = async(userId)=>{
   if (!userId) {
      throw new BadRequestError("User id is required")
   }

   try {
      const deletedUser = await prisma.user.delete({
         where: { id: userId }
      })

      await deleteUserCache(userId)
      await deleteRefreshTokens(userId)

      return removePassword(deletedUser)
   } catch (error) {
      if (error?.code === "P2025") {
         throw new NotFoundError("User not found")
      }
      throw error
   }
}
