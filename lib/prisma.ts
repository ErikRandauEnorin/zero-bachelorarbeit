import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Stash the Prisma client on the global object in development so that
// Next.js's hot-reloading doesn't create a new client (and new DB
// connections) on every file change.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Lazily creates (or reuses) the singleton Prisma client, backed by the
// Postgres driver adapter.
export function getPrisma() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL ist nicht gesetzt."); // "DATABASE_URL is not set."
  }

  const adapter = new PrismaPg({
    connectionString,
  });

  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Only cache globally outside production, to avoid leaking the pattern
  // into serverless/production environments where each instance should
  // manage its own client lifecycle.
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}