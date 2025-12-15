import { pgTable, uuid, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { evaluations } from "./evaluation.js";

export const emailTypeEnum = pgEnum("emailtype", ["INVITE", "REJECT", "HOLD"]);

export const emailDrafts = pgTable("email_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  evaluationId: uuid("evaluation_id").notNull().references(() => evaluations.id),
  emailType: emailTypeEnum("email_type").notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type EmailDraft = typeof emailDrafts.$inferSelect;
export type NewEmailDraft = typeof emailDrafts.$inferInsert;
export type EmailType = "INVITE" | "REJECT" | "HOLD";
