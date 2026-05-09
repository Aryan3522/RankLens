import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default(""),
  SESSION_SECRET: z.string().default("default_session_secret_at_least_16_chars_long"),
  JWT_SECRET: z.string().default("default_jwt_secret_at_least_16_chars_long"),
  PORT: z.string().transform(Number).default("8080"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().default("https://rank-lens-delta.vercel.app"),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.warn("⚠️ Some environment variables are missing or invalid. Using defaults.");
    // Fallback to raw process.env to avoid crashing
    return process.env as any;
  }

  return parsed.data;
}

export const env = validateEnv();
