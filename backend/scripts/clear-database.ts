import { db } from "../src/database.js";
import { jobs } from "../src/models/job.js";
import { candidates } from "../src/models/candidate.js";
import { evaluations } from "../src/models/evaluation.js";
import { auditLogs } from "../src/models/auditLog.js";
import { emailDrafts } from "../src/models/emailDraft.js";
import { users } from "../src/models/user.js";

async function clearDatabase() {
  console.log("🗑️  Starting database cleanup...");
  
  try {
    // Delete in order due to foreign key constraints
    console.log("Deleting email drafts...");
    await db.delete(emailDrafts);
    
    console.log("Deleting evaluations...");
    await db.delete(evaluations);
    
    console.log("Deleting audit logs...");
    await db.delete(auditLogs);
    
    console.log("Deleting candidates...");
    await db.delete(candidates);
    
    console.log("Deleting jobs...");
    await db.delete(jobs);
    
    console.log("Deleting users...");
    await db.delete(users);
    
    console.log("✅ Database cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    throw error;
  }
}

clearDatabase()
  .then(() => {
    console.log("✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to clear database:", error);
    process.exit(1);
  });

