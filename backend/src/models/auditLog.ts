import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { candidates } from "./candidate.js";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id").notNull().references(() => candidates.id),
  action: varchar("action", { length: 100 }).notNull(),
  actionMetadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
