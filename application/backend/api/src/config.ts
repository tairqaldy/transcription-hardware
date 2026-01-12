import dotenv from "dotenv";

dotenv.config();

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const parsePort = (value: string | undefined): number => {
  if (!value) return 3001;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid PORT value: ${value}`);
  }
  return parsed;
};

const corsOrigin = process.env.CORS_ORIGIN ?? "";
const corsOrigins = corsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export const config = {
  port: parsePort(process.env.PORT),
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  googleAiApiKey: requireEnv("GOOGLE_AI_API_KEY"),
  summaryModel: process.env.SUMMARY_MODEL ?? "gemini-1.5-pro",
  corsOrigins,
};
