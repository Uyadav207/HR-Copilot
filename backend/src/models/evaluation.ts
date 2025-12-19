import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum, real, unique } from "drizzle-orm/pg-core";
import { candidates } from "./candidate.js";

export const evaluationDecisionEnum = pgEnum("evaluationdecision", ["YES", "MAYBE", "NO"]);
export const finalDecisionEnum = pgEnum("finaldecision", ["INVITED", "REJECTED", "ON_HOLD"]);

export const evaluations = pgTable("evaluations", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id").notNull().references(() => candidates.id),
  decision: evaluationDecisionEnum("decision").notNull(),
  confidence: real("confidence").notNull(),
  criteriaMatches: jsonb("criteria_matches").$type<Record<string, any>[]>().notNull(),
  strengths: jsonb("strengths").$type<Record<string, any>[]>().notNull(),
  concerns: jsonb("concerns").$type<Record<string, any>[]>().notNull(),
  redFlagsFound: jsonb("red_flags_found").$type<Record<string, any>[]>().notNull(),
  summary: text("summary").notNull(),
  recommendedQuestions: jsonb("recommended_questions").$type<string[]>(),
  promptVersion: varchar("prompt_version", { length: 50 }),
  finalDecision: finalDecisionEnum("final_decision"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  // Enhanced evaluation data (RAG-based detailed analysis)
  enhancedData: jsonb("enhanced_data").$type<Record<string, any>>(),
}, (table) => ({
  candidateIdUnique: unique().on(table.candidateId),
}));

export type Evaluation = typeof evaluations.$inferSelect;
export type NewEvaluation = typeof evaluations.$inferInsert;
export type EvaluationDecision = "YES" | "MAYBE" | "NO";
export type FinalDecision = "INVITED" | "REJECTED" | "ON_HOLD";
