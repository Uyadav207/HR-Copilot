import { config } from "dotenv";

config();

export interface Settings {
  // Database
  databaseUrl: string;
  
  // Redis
  redisUrl: string;
  
  // LLM Configuration
  llmProvider: "openai" | "anthropic" | "gemini";
  openaiApiKey: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  openaiModel: string;
  anthropicModel: string;
  geminiModel: string;
  
  // Pinecone Configuration
  pineconeApiKey: string;
  pineconeIndexName: string;
  pineconeEnvironment?: string;
  
  // Embedding Configuration
  embeddingModel: string;
  embeddingDimension: number;
  
  // Application
  environment: string;
  logLevel: string;
  apiPrefix: string;

  // Auth
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  
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
  llmProvider: (process.env.LLM_PROVIDER as "openai" | "anthropic" | "gemini") || "gemini",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-3-opus-20240229",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  pineconeApiKey: process.env.PINECONE_API_KEY || "",
  pineconeIndexName: process.env.PINECONE_INDEX_NAME || "cv-chunks",
  pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
  embeddingModel:
    process.env.EMBEDDING_MODEL ||
    ((process.env.LLM_PROVIDER as string) === "gemini" ? "text-embedding-004" : "text-embedding-3-small"),
  embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || "512"),
  environment: process.env.ENVIRONMENT || "development",
  logLevel: process.env.LOG_LEVEL || "INFO",
  apiPrefix: process.env.API_PREFIX || "/api",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresInSeconds: parseInt(process.env.JWT_EXPIRES_IN_SECONDS || "604800", 10), // 7 days default
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001"),
  emailHost: process.env.EMAIL_HOST || "smtp.gmail.com",
  emailPort: parseInt(process.env.EMAIL_PORT || "587"),
  emailUser: process.env.EMAIL_USER || "",
  emailPass: process.env.EMAIL_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "",
  emailTo: process.env.EMAIL_TO || "",
  hiringManager: process.env.HIRING_MANAGER || "Hiring Manager",
};
