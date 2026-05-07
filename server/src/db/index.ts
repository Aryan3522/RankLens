import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  const errorMessage = "DATABASE_URL is missing. The application requires a PostgreSQL connection string to start.";
  if (process.env.VERCEL === "1") {
    console.error(errorMessage + " Please add it to your Vercel Environment Variables.");
  } else {
    throw new Error(
      errorMessage + "\n\n" +
      "TIP: If running locally, ensure you have a .env file and use the --env-file flag:\n" +
      "  node --env-file .env dist/index.mjs\n" +
      "OR use 'npm start' which handles this for you.\n"
    );
  }
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy" 
});
export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
