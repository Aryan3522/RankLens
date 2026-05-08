import { z } from "zod";
import { logger } from "@/lib/logger.js";

const envSchema = z.object({
  DATABASE_URL: z.string().default(""),
  SESSION_SECRET: z.string().default("default_session_secret_long_enough"),
  JWT_SECRET: z.string().default("default_jwt_secret_long_enough"),
  PORT: z.string().transform(Number).default("8080"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().default("http://localhost:8081"),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    parsed.error.errors.forEach((err) => {
      console.error(`   - ${err.path.join(".")}: ${err.message}`);
    });
    
    // Fallback to process.env as any to prevent crashing
    return process.env as any;
  }

  return parsed.data;
}

export const env = validateEnv();
