#!/usr/bin/env bun
/**
 * Check if enhanced_data column exists, and add it if missing
 * Run with: bun run scripts/check-and-add-enhanced-data-column.ts
 */

import { db } from "../src/database.js";
import { sql } from "drizzle-orm";

async function checkAndAddColumn() {
  try {
    console.log("🔍 Checking if enhanced_data column exists...");
    
    // Check if column exists - drizzle returns results differently
    const result: any = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'evaluations' 
      AND column_name = 'enhanced_data'
    `);
    
    // Handle different result formats
    const rows = result.rows || result || [];
    const hasColumn = Array.isArray(rows) && rows.length > 0;
    
    if (hasColumn) {
      console.log("✅ enhanced_data column already exists!");
      process.exit(0);
      return;
    }
    
    console.log("⚠️  enhanced_data column not found. Adding it now...");
    
    // Add the column
    await db.execute(sql`
      ALTER TABLE evaluations 
      ADD COLUMN IF NOT EXISTS enhanced_data JSONB
    `);
    
    // Add comment
    try {
      await db.execute(sql`
        COMMENT ON COLUMN evaluations.enhanced_data IS 
        'Stores enhanced evaluation data from RAG-based analysis including matching_strengths, missing_gaps, criteria_analysis, brutal_gap_analysis, and other detailed evaluation fields'
      `);
    } catch (commentError) {
      // Comment might fail, but column addition is what matters
      console.log("⚠️  Could not add comment (non-critical)");
    }
    
    console.log("✅ Successfully added enhanced_data column!");
    console.log("💡 You can now re-evaluate candidates to see enhanced evaluation data.");
    
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      // If column already exists, that's fine
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log("✅ Column already exists (that's fine!)");
        process.exit(0);
        return;
      }
    }
    process.exit(1);
  }
}

checkAndAddColumn();
