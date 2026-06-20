import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().transform(Number).default("8080"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().default("https://rank-lens-delta.vercel.app"),
  CHROME_POOL_SIZE: z.string().transform(Number).default("2"),
  CHROME_PATH: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default("claude-haiku-4-5"),
  ALLOW_LOCAL_URLS: z.string().optional(),
  DATABASE_PATH: z.string().default("./data/ranklens.db"),
  JWT_SECRET: z.string().default("ranklens-jwt-secret-change-in-production"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default("587"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  ADMIN_UPI_ID: z.string().optional(),
  ADMIN_UPI_NAME: z.string().optional(),
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
