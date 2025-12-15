import { config } from "dotenv";

config();

export interface Settings {
  // Database
  databaseUrl: string;
  
  // Redis
  redisUrl: string;
  
  // LLM Configuration
  llmProvider: "openai" | "anthropic";
  openaiApiKey: string;
  anthropicApiKey: string;
  openaiModel: string;
  anthropicModel: string;
  
  // Application
  environment: string;
  logLevel: string;
  apiPrefix: string;
  
  // CORS
  corsOrigins: string[];
  
  // Email Configuration
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPass: string;
  emailFrom: string;
  emailTo: string;
  hiringManager: string;
}

function parseCorsOrigins(originsStr: string): string[] {
  if (!originsStr || !originsStr.trim()) {
    return ["http://localhost:3000", "http://localhost:3001"];
  }
  return originsStr
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export const settings: Settings = {
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/hr_autopilot",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379/0",
  llmProvider: (process.env.LLM_PROVIDER as "openai" | "anthropic") || "openai",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-3-opus-20240229",
  environment: process.env.ENVIRONMENT || "development",
  logLevel: process.env.LOG_LEVEL || "INFO",
  apiPrefix: process.env.API_PREFIX || "/api",
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001"),
  emailHost: process.env.EMAIL_HOST || "smtp.gmail.com",
  emailPort: parseInt(process.env.EMAIL_PORT || "587"),
  emailUser: process.env.EMAIL_USER || "",
  emailPass: process.env.EMAIL_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "",
  emailTo: process.env.EMAIL_TO || "",
  hiringManager: process.env.HIRING_MANAGER || "Hiring Manager",
};
