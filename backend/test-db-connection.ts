import { db } from "./src/database.js";
import { users } from "./src/models/user.js";
import { eq } from "drizzle-orm";

async function test() {
  try {
    console.log("Testing database connection...");
    const result = await db.select().from(users).limit(1);
    console.log("✅ Successfully connected to users table!");
    console.log("Result:", result);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("Code:", error.code);
  }
  process.exit(0);
}

test();
