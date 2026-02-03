/**
 * Database connection and Drizzle ORM instance.
 * Uses the postgres.js driver; connection string is normalized from postgresql:// to postgres://.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { settings } from "./config.js";
import * as schema from "./models/index.js";

const connectionString = settings.databaseUrl.replace(/^postgresql\+?[a-z]*:\/\//, "postgres://");

const client = postgres(connectionString, {
  max: 10,
});

/** Shared Drizzle instance with all schema tables registered. Use this for all DB access. */
export const db = drizzle(client, { schema });

/** Returns the same db instance; useful for dependency injection or tests. */
export async function getDatabase() {
  return db;
}
