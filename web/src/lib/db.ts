import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL;

export const db = databaseUrl
  ? (globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      }))
  : null as unknown as PrismaClient; // Fallback for build time

if (process.env.NODE_ENV !== 'production' && databaseUrl) {
  globalForPrisma.prisma = db;
}

// Helper function to check if database is available
export const isDatabaseAvailable = (): boolean => {
  return !!process.env.DATABASE_URL;
}