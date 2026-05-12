import PrismaPkg from '@prisma/client';
const { PrismaClient } = PrismaPkg;
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

/**
 * step 1 -> install prisma as dev deps -> npm i -D prisma
 * step 2 -> install prisma clinet -> npm i @prisma/client
 * step 3 -> install adpter -> npm i @prisma/adapter-pg
 * step 4 -> install pg -> npm i pg
 * step 5 -> initilize prisma -> npx prisma init --datasource-provider postgresql
 * step 5 -> add your schema in schema.prisma file
 * step 7 -> migrate prisma -> npx prisma migrate dev --name init
 * step 7 -> generate prisma clinet -> npx prisma generate
 */