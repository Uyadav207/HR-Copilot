/**
 * Embedding Service
 *
 * Generates embeddings for CV chunks using OpenAI or Google Gemini based on LLM_PROVIDER.
 */

import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { settings } from "../config.js";
import type { CVChunk } from "./cvChunkingService.js";

type EmbeddingProvider = "openai" | "gemini";

export class EmbeddingService {
  private provider: EmbeddingProvider;
  private openaiClient?: OpenAI;
  private geminiClient?: GoogleGenAI;
  private model: string;

  constructor() {
    this.provider = settings.llmProvider === "gemini" ? "gemini" : "openai";

    if (this.provider === "gemini") {
      if (!settings.geminiApiKey) {
        throw new Error("GEMINI_API_KEY is required for embeddings when using Gemini");
      }
      this.geminiClient = new GoogleGenAI({ apiKey: settings.geminiApiKey });
      this.model = settings.embeddingModel;
    } else {
      if (!settings.openaiApiKey) {
        throw new Error("OPENAI_API_KEY is required for embeddings when using OpenAI");
      }
      this.openaiClient = new OpenAI({ apiKey: settings.openaiApiKey });
      this.model = settings.embeddingModel;
    }
  }

  /**
   * Generate embeddings for a single chunk
   */
  async embedChunk(chunk: CVChunk): Promise<number[]> {
    if (this.provider === "gemini") {
      return this.embedChunkGemini(chunk);
    }
    return this.embedChunkOpenAI(chunk);
  }

  private async embedChunkOpenAI(chunk: CVChunk): Promise<number[]> {
    const client = this.openaiClient!;
    try {
      const response = await client.embeddings.create({
        model: this.model,
        input: chunk.text,
        dimensions: settings.embeddingDimension,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error(`Error embedding chunk ${chunk.chunkIndex}:`, error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async embedChunkGemini(chunk: CVChunk): Promise<number[]> {
    const client = this.geminiClient!;
    try {
      const response = await client.models.embedContent({
        model: this.model,
        contents: chunk.text,
        config: { outputDimensionality: settings.embeddingDimension },
      });
      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) throw new Error("No embedding in response");
      return embedding;
    } catch (error) {
      console.error(`Error embedding chunk ${chunk.chunkIndex}:`, error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate embeddings for multiple chunks in batch
   */
  async embedChunks(chunks: CVChunk[]): Promise<Map<number, number[]>> {
    if (this.provider === "gemini") {
      return this.embedChunksGemini(chunks);
    }
    return this.embedChunksOpenAI(chunks);
  }

  private async embedChunksOpenAI(chunks: CVChunk[]): Promise<Map<number, number[]>> {
    const embeddings = new Map<number, number[]>();
    const client = this.openaiClient!;
    const batchSize = 100;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((chunk) => chunk.text);

      try {
        const response = await client.embeddings.create({
          model: this.model,
          input: texts,
          dimensions: settings.embeddingDimension,
        });

        response.data.forEach((embedding, index) => {
          const chunkIndex = batch[index].chunkIndex;
          embeddings.set(chunkIndex, embedding.embedding);
        });

        console.log(`✅ Embedded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${batch.length} chunks)`);
      } catch (error) {
        console.error(`Error embedding batch starting at index ${i}:`, error);
        throw new Error(`Failed to generate embeddings for batch: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return embeddings;
  }

  private async embedChunksGemini(chunks: CVChunk[]): Promise<Map<number, number[]>> {
    const embeddings = new Map<number, number[]>();
    const client = this.geminiClient!;
    // Gemini embedContent supports batch; use smaller batches for safety
    const batchSize = 100;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((chunk) => chunk.text);

      try {
        const response = await client.models.embedContent({
          model: this.model,
          contents: texts,
          config: { outputDimensionality: settings.embeddingDimension },
        });

        const embeds = response.embeddings ?? [];
        embeds.forEach((item, index) => {
          const values = item.values;
          if (values && batch[index]) {
            embeddings.set(batch[index].chunkIndex, values);
          }
        });

        console.log(`✅ Embedded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${batch.length} chunks)`);
      } catch (error) {
        console.error(`Error embedding batch starting at index ${i}:`, error);
        throw new Error(`Failed to generate embeddings for batch: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return embeddings;
  }

  /**
   * Generate embedding for a query string (used for retrieval)
   */
  async embedQuery(query: string): Promise<number[]> {
    if (this.provider === "gemini") {
      const client = this.geminiClient!;
      try {
        const response = await client.models.embedContent({
          model: this.model,
          contents: query,
          config: { outputDimensionality: settings.embeddingDimension },
        });
        const embedding = response.embeddings?.[0]?.values;
        if (!embedding) throw new Error("No embedding in response");
        return embedding;
      } catch (error) {
        console.error("Error embedding query:", error);
        throw new Error(`Failed to generate query embedding: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const client = this.openaiClient!;
    try {
      const response = await client.embeddings.create({
        model: this.model,
        input: query,
        dimensions: settings.embeddingDimension,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error("Error embedding query:", error);
      throw new Error(`Failed to generate query embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
