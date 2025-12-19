/**
 * Vector Store Service
 * 
 * Manages CV chunk embeddings in Pinecone vector database.
 * Uses namespaces per candidate for isolation.
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { settings } from "../config.js";
import type { CVChunk } from "./cvChunkingService.js";
import { EmbeddingService } from "./embeddingService.js";

export interface RetrievedChunk {
  chunkIndex: number;
  text: string;
  sectionType: CVChunk["sectionType"];
  metadata: CVChunk["metadata"];
  score: number;
}

export class VectorStoreService {
  private pinecone: Pinecone;
  private indexName: string;
  private embeddingService: EmbeddingService;

  constructor() {
    if (!settings.pineconeApiKey) {
      throw new Error("PINECONE_API_KEY is required");
    }

    this.pinecone = new Pinecone({
      apiKey: settings.pineconeApiKey,
    });

    this.indexName = settings.pineconeIndexName;
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Get or create the Pinecone index
   */
  private async getIndex() {
    try {
      // Try to access the index directly first (faster)
      const index = this.pinecone.index(this.indexName);
      
      // Verify index exists by checking list (optional, but helpful for error messages)
      try {
        const indexList = await this.pinecone.listIndexes();
        const indexExists = indexList.indexes?.some(idx => idx.name === this.indexName);
        
        if (!indexExists) {
          console.warn(`⚠️ Pinecone index "${this.indexName}" does not exist. Please create it in Pinecone dashboard.`);
          console.warn(`   Index name: ${this.indexName}`);
          console.warn(`   Dimension: ${settings.embeddingDimension}`);
          console.warn(`   Metric: cosine (recommended)`);
          throw new Error(`Pinecone index "${this.indexName}" not found. Please create it first.`);
        }
      } catch (listError) {
        // If list fails, we'll try to use the index anyway (might be a permissions issue)
        console.warn(`Could not verify index existence, proceeding anyway...`);
      }
      
      return index;
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error; // Re-throw our custom error
      }
      console.error(`Error accessing Pinecone index ${this.indexName}:`, error);
      throw new Error(`Failed to access Pinecone index: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upsert CV chunks for a candidate
   * Uses namespace per candidate: candidate-{candidateId}
   * Batches upserts to stay under Pinecone's 2MB request limit
   */
  async upsertChunks(candidateId: string, chunks: CVChunk[]): Promise<void> {
    try {
      console.log(`🔄 Upserting ${chunks.length} chunks for candidate ${candidateId}...`);

      // Generate embeddings for all chunks
      const embeddings = await this.embeddingService.embedChunks(chunks);

      // Prepare vectors for Pinecone
      const vectors = chunks.map((chunk) => {
        const embedding = embeddings.get(chunk.chunkIndex);
        if (!embedding) {
          throw new Error(`Missing embedding for chunk ${chunk.chunkIndex}`);
        }

        return {
          id: `chunk-${candidateId}-${chunk.chunkIndex}`,
          values: embedding,
          metadata: {
            candidateId,
            chunkIndex: chunk.chunkIndex,
            sectionType: chunk.sectionType,
            text: chunk.text.substring(0, 1000), // Store first 1000 chars in metadata for quick access
            startChar: chunk.startChar,
            endChar: chunk.endChar,
            ...chunk.metadata,
          },
        };
      });

      // Pinecone has a 2MB request size limit
      // Calculate safe batch size: 
      // - 512 dimensions * 4 bytes (float) = ~2KB per vector
      // - Plus metadata (~500 bytes) = ~2.5KB per vector
      // - 2MB / 2.5KB ≈ 800 vectors, but use 100 to be safe
      const PINECONE_BATCH_SIZE = 100;
      const index = await this.getIndex();
      const namespace = `candidate-${candidateId}`;

      // Upsert in batches to stay under 2MB limit
      for (let i = 0; i < vectors.length; i += PINECONE_BATCH_SIZE) {
        const batch = vectors.slice(i, i + PINECONE_BATCH_SIZE);
        await index.namespace(namespace).upsert(batch);
        console.log(`  ✅ Upserted batch ${Math.floor(i / PINECONE_BATCH_SIZE) + 1}/${Math.ceil(vectors.length / PINECONE_BATCH_SIZE)} (${batch.length} vectors)`);
      }

      console.log(`✅ Successfully upserted ${vectors.length} chunks to namespace ${namespace}`);
    } catch (error) {
      console.error(`Error upserting chunks for candidate ${candidateId}:`, error);
      throw new Error(`Failed to upsert chunks: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search for relevant chunks based on a query
   */
  async searchRelevantChunks(
    candidateId: string,
    query: string,
    topK: number = 5,
    filter?: { sectionType?: CVChunk["sectionType"] }
  ): Promise<RetrievedChunk[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingService.embedQuery(query);

      // Search in candidate's namespace
      const index = await this.getIndex();
      const namespace = `candidate-${candidateId}`;

      // Build metadata filter if provided
      const metadataFilter: any = {};
      if (filter?.sectionType) {
        metadataFilter.sectionType = filter.sectionType;
      }

      const queryResponse = await index.namespace(namespace).query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter: Object.keys(metadataFilter).length > 0 ? metadataFilter : undefined,
      });

      // Transform results to RetrievedChunk format
      const retrievedChunks: RetrievedChunk[] = (queryResponse.matches || []).map((match) => {
        const metadata = match.metadata || {};
        return {
          chunkIndex: metadata.chunkIndex as number,
          text: metadata.text as string || "",
          sectionType: (metadata.sectionType as CVChunk["sectionType"]) || "other",
          metadata: {
            candidateId: metadata.candidateId as string,
            company: metadata.company as string | undefined,
            role: metadata.role as string | undefined,
            institution: metadata.institution as string | undefined,
            degree: metadata.degree as string | undefined,
          },
          score: match.score || 0,
        };
      });

      return retrievedChunks;
    } catch (error) {
      console.error(`Error searching chunks for candidate ${candidateId}:`, error);
      // Return empty array on error rather than throwing (graceful degradation)
      return [];
    }
  }

  /**
   * Delete all chunks for a candidate
   * Note: In Pinecone v6, we need to track vector IDs to delete them.
   * For now, this is a placeholder - namespaces provide isolation anyway.
   * TODO: Implement proper deletion by tracking vector IDs in database.
   */
  async deleteCandidateChunks(candidateId: string): Promise<void> {
    try {
      // Namespaces in Pinecone provide isolation, so chunks are effectively
      // "deleted" when we stop querying that namespace.
      // For actual deletion, we would need to track vector IDs.
      console.log(`ℹ️ Chunks for candidate ${candidateId} are in isolated namespace (candidate-${candidateId})`);
      // Future: Implement deletion by tracking vector IDs in database
    } catch (error) {
      console.error(`Error in deleteCandidateChunks for candidate ${candidateId}:`, error);
      // Don't throw - deletion is best effort
    }
  }

  /**
   * Check if chunks exist for a candidate
   */
  async hasChunks(candidateId: string): Promise<boolean> {
    try {
      const index = await this.getIndex();
      const namespace = `candidate-${candidateId}`;

      // Try a simple query to see if namespace has data
      // Use a dummy vector of correct dimension
      const dummyVector = new Array(settings.embeddingDimension).fill(0);
      const queryResponse = await index.namespace(namespace).query({
        vector: dummyVector,
        topK: 1,
        includeMetadata: false,
      });

      return (queryResponse.matches?.length || 0) > 0;
    } catch (error) {
      // If namespace doesn't exist or has no data, return false
      return false;
    }
  }
}
