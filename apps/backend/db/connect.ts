// Import directly from index because AWS seems to have trouble finding the module otherwise
import {
  PrismaClient as PrismaClientType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { Resource } from "sst";

// Create env variable for prisma db connection
process.env["DATABASE_URL"] =
  process.env.DATABASE_URL ?? Resource.DATABASE_URL.value;

/** Initialize our prisma client */
const db: PrismaClientType = new PrismaClient();

export { db, Prisma };
