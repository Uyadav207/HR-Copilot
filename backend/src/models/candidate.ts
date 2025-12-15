import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { jobs } from "./job.js";

export const candidateStatusEnum = pgEnum("candidatestatus", [
  "PENDING",
  "EVALUATED",
  "INVITED",
  "REJECTED",
  "ON_HOLD",
]);

export const candidates = pgTable("candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobs.id),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  cvFilename: varchar("cv_filename", { length: 255 }).notNull(),
  cvRawText: text("cv_raw_text").notNull(),
  profile: jsonb("profile").$type<Record<string, any>>(),
  promptVersion: varchar("prompt_version", { length: 50 }),
  status: candidateStatusEnum("status").default("PENDING").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
export type CandidateStatus = "PENDING" | "EVALUATED" | "INVITED" | "REJECTED" | "ON_HOLD";
