/**
 * Embedding Service
 * 
 * Generates embeddings for CV chunks using OpenAI's embedding model.
 */

import OpenAI from "openai";
import { settings } from "../config.js";
import type { CVChunk } from "./cvChunkingService.js";

export class EmbeddingService {
  private client: OpenAI;
  private model: string;

  constructor() {
    if (!settings.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required for embeddings");
    }
    this.client = new OpenAI({ apiKey: settings.openaiApiKey });
    this.model = settings.embeddingModel;
  }

  /**
   * Generate embeddings for a single chunk
   */
  async embedChunk(chunk: CVChunk): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: chunk.text,
        dimensions: settings.embeddingDimension, // Use configured dimension
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error(`Error embedding chunk ${chunk.chunkIndex}:`, error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate embeddings for multiple chunks in batch
   * OpenAI supports up to 2048 inputs per request, but we'll batch in 100s for safety
   */
  async embedChunks(chunks: CVChunk[]): Promise<Map<number, number[]>> {
    const embeddings = new Map<number, number[]>();
    const batchSize = 100;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((chunk) => chunk.text);

      try {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: texts,
          dimensions: settings.embeddingDimension, // Use configured dimension
        });

        // Map embeddings back to chunks
        response.data.forEach((embedding, index) => {
          const chunkIndex = batch[index].chunkIndex;
          embeddings.set(chunkIndex, embedding.embedding);
        });

        console.log(`✅ Embedded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${batch.length} chunks)`);
      } catch (error) {
        console.error(`Error embedding batch starting at index ${i}:`, error);
        // Continue with other batches, but log the error
        throw new Error(`Failed to generate embeddings for batch: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return embeddings;
  }

  /**
   * Generate embedding for a query string (used for retrieval)
   */
  async embedQuery(query: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: query,
        dimensions: settings.embeddingDimension, // Use configured dimension
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error embedding query:", error);
      throw new Error(`Failed to generate query embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
