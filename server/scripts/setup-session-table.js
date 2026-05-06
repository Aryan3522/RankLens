import pg from "pg";

// Manually extract DATABASE_URL from .env
import fs from "fs";
import path from "path";
const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\s]+)"?/);
const databaseUrl = dbUrlMatch ? dbUrlMatch[1] : null;

if (!databaseUrl) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: databaseUrl });

const sql = `
  CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL
  ) WITH (OIDS=FALSE);
  
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey') THEN
      ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
  END
  $$;

  CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
`;

async function run() {
  try {
    await pool.query(sql);
    console.log("Session table setup complete.");
  } catch (err) {
    console.error("Error setting up session table:", err);
  } finally {
    await pool.end();
  }
}

run();
