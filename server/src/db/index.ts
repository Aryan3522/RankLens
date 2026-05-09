import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  const errorMessage = "DATABASE_URL is missing. Please add your PostgreSQL connection string to your environment variables.";
  if (process.env.VERCEL === "1") {
    console.error(errorMessage);
  } else {
    console.warn("\x1b[33m%s\x1b[0m", "WARNING: " + errorMessage);
    console.warn("The server will start, but database-dependent features will fail.");
  }
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy",
  ssl: process.env.DATABASE_URL?.includes("neon.tech") || 
       process.env.DATABASE_URL?.includes("render.com") || 
       process.env.DATABASE_URL?.includes("supabase") || 
       process.env.DATABASE_URL?.includes("neondb")
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20, // Max concurrent connections
});

// Add error listener to prevent 500 crashes during idle/unexpected DB errors
pool.on("error", (err) => {
  console.error("❌ PostgreSQL Pool Error:", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
