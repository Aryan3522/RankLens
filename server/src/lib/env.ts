import { z } from "zod";
import { logger } from "@/lib/logger.js";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string").default("postgresql://postgres:password@localhost:5432/ranklens"),
  SESSION_SECRET: z.string().min(16).default("dev-session-secret-at-least-16-chars-long"),
  JWT_SECRET: z.string().min(16).default("dev-jwt-secret-at-least-16-chars-long"),
  PORT: z.string().transform(Number).default("8080"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().default("http://localhost:8081"),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    logger.error("❌ Invalid environment variables:");
    parsed.error.errors.forEach((err) => {
      logger.error(`   - ${err.path.join(".")}: ${err.message}`);
    });
    
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    } else {
      logger.warn("⚠️ Server starting with invalid/missing env vars. Some features may fail.");
    }
    return process.env as any as z.infer<typeof envSchema>;
  }

  return parsed.data;
}

export const env = validateEnv();
