import { PrismaClient } from "@prisma/client";

// One PrismaClient for the whole process. Each client opens its own pool, and
// the Supabase session pooler caps clients per project, so the old pattern of
// `new PrismaClient()` in every module exhausted it under load (requests hung,
// /api/health reported the DB offline, uploads failed on settings reads).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
