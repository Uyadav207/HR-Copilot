#!/usr/bin/env bun
/**
 * Helper script to check if Pinecone index exists and create it if needed
 * 
 * Usage: bun run scripts/check-pinecone-index.ts
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "dotenv";

config();

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || "cv-chunks";
const DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || "1536");

if (!PINECONE_API_KEY) {
  console.error("❌ PINECONE_API_KEY not set in environment");
  process.exit(1);
}

async function checkAndCreateIndex() {
  const pinecone = new Pinecone({
    apiKey: PINECONE_API_KEY,
  });

  try {
    // List all indexes
    console.log("🔍 Checking Pinecone indexes...");
    const indexList = await pinecone.listIndexes();
    const existingIndexes = indexList.indexes || [];
    
    console.log(`Found ${existingIndexes.length} existing index(es):`);
    existingIndexes.forEach(idx => {
      console.log(`  - ${idx.name} (dimension: ${idx.dimension})`);
    });

    // Check if our index exists
    const indexExists = existingIndexes.some(idx => idx.name === INDEX_NAME);

    if (indexExists) {
      console.log(`\n✅ Index "${INDEX_NAME}" already exists!`);
      const index = pinecone.index(INDEX_NAME);
      console.log(`   Ready to use.`);
      return;
    }

    // Index doesn't exist, offer to create it
    console.log(`\n⚠️  Index "${INDEX_NAME}" does not exist.`);
    console.log(`\nTo create it, run this command in your terminal:`);
    console.log(`\n  curl -X POST "https://api.pinecone.io/indexes" \\`);
    console.log(`    -H "Api-Key: ${PINECONE_API_KEY}" \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '{`);
    console.log(`      "name": "${INDEX_NAME}",`);
    console.log(`      "dimension": ${DIMENSION},`);
    console.log(`      "metric": "cosine",`);
    console.log(`      "spec": {`);
    console.log(`        "serverless": {`);
    console.log(`          "cloud": "aws",`);
    console.log(`          "region": "us-east-1"`);
    console.log(`        }`);
    console.log(`      }`);
    console.log(`    }'`);
    
    console.log(`\nOr create it via Pinecone dashboard:`);
    console.log(`  1. Go to https://app.pinecone.io`);
    console.log(`  2. Click "Create Index"`);
    console.log(`  3. Name: ${INDEX_NAME}`);
    console.log(`  4. Dimension: ${DIMENSION}`);
    console.log(`  5. Metric: cosine`);
    console.log(`  6. Create!`);

  } catch (error) {
    console.error("❌ Error checking Pinecone indexes:", error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
    }
    process.exit(1);
  }
}

checkAndCreateIndex();
