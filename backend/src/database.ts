import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { settings } from "./config.js";
import * as schema from "./models/index.js";

// Convert postgresql:// to postgres:// for the postgres library
const connectionString = settings.databaseUrl.replace(/^postgresql\+?[a-z]*:\/\//, "postgres://");

const client = postgres(connectionString, {
  max: 10,
});

export const db = drizzle(client, { schema });

export async function getDatabase() {
  return db;
}
