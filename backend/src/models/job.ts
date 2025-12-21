import { pgTable, uuid, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  rawDescription: text("raw_description").notNull(),
  blueprint: jsonb("blueprint").$type<Record<string, any>>(),
  promptVersion: varchar("prompt_version", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
