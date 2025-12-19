import type { Config } from "drizzle-kit";
import { config } from "dotenv";

config();

// Use explicit file list to avoid module resolution issues with drizzle-kit
export default {
  schema: [
    "./src/models/job.ts",
    "./src/models/candidate.ts", 
    "./src/models/auditLog.ts",
    "./src/models/evaluation.ts",
    "./src/models/emailDraft.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/hr_autopilot",
  },
} satisfies Config;
