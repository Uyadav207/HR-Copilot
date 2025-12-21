import { db } from "../src/database.js";
import postgres from "postgres";
import { config } from "dotenv";

config();

// Convert postgresql:// to postgres:// for the postgres library
const connectionString = process.env.DATABASE_URL?.replace(/^postgresql\+?[a-z]*:\/\//, "postgres://") || "";

const sql = postgres(connectionString);

async function applyMigration() {
  console.log("🔄 Applying multi-tenant database migration...");
  
  try {
    // Step 1: Add company and why_using_platform to users
    console.log("Adding company and why_using_platform columns to users table...");
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS company VARCHAR(255),
      ADD COLUMN IF NOT EXISTS why_using_platform TEXT;
    `;
    
    // Step 2: Update existing users with default company
    console.log("Setting default company for existing users...");
    await sql`
      UPDATE users 
      SET company = 'My Company' 
      WHERE company IS NULL OR company = '';
    `;
    
    // Step 3: Make company NOT NULL
    console.log("Making company column NOT NULL...");
    await sql`
      ALTER TABLE users 
      ALTER COLUMN company SET NOT NULL;
    `;
    
    // Step 4: Add user_id to jobs
    console.log("Adding user_id column to jobs table...");
    await sql`
      ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS user_id UUID;
    `;
    
    // Step 5: Create index
    console.log("Creating index on jobs.user_id...");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
    `;
    
    // Step 6: Delete orphaned jobs (jobs without valid users)
    console.log("Cleaning up orphaned jobs...");
    await sql`
      DELETE FROM jobs 
      WHERE user_id IS NOT NULL 
      AND user_id NOT IN (SELECT id FROM users);
    `;
    
    // Step 7: Add foreign key constraint if it doesn't exist
    console.log("Adding foreign key constraint...");
    const constraintExists = await sql`
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'jobs_user_id_users_id_fk';
    `;
    
    if (constraintExists.length === 0) {
      await sql`
        ALTER TABLE jobs 
        ADD CONSTRAINT jobs_user_id_users_id_fk 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      `;
      console.log("✅ Foreign key constraint added");
    } else {
      console.log("✅ Foreign key constraint already exists");
    }
    
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyMigration()
  .then(() => {
    console.log("✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to apply migration:", error);
    process.exit(1);
  });

