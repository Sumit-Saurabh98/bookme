import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from "./index.js";
const connectionString = config.DATABASE_URL;

const globalForPrisma = global;

if (!globalForPrisma.prisma) {
     const adapter = new PrismaPg({ connectionString });

     globalForPrisma.prisma = new PrismaClient({
          adapter,
          log: ['error', 'warn'],
     });
}

export const prisma = globalForPrisma.prisma;