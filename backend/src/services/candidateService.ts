import { eq, and, inArray, desc } from "drizzle-orm";
import { db } from "../database.js";
import { candidates, type Candidate, type NewCandidate, type CandidateStatus } from "../models/candidate.js";
import { jobs } from "../models/job.js";
import { evaluations } from "../models/evaluation.js";
import { auditLogs, type NewAuditLog } from "../models/auditLog.js";
import { PDFParser } from "./pdfParser.js";
import { LLMClient } from "./llmClient.js";
import { PROMPT_VERSION } from "../prompts/registry.js";
import { settings } from "../config.js";
import { evaluations } from "../models/evaluation.js";
import { emailDrafts } from "../models/emailDraft.js";
import { randomUUID } from "crypto";
import { CVChunkingService } from "./cvChunkingService.js";
import { VectorStoreService } from "./vectorStoreService.js";
import { StorageService } from "./storageService.js";

export class CandidateService {
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  async uploadCandidates(
    userId: string,
    jobId: string,
    files: Array<{ filename: string; content: Buffer }>
  ): Promise<Candidate[]> {
    // Verify job belongs to user
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));
    if (!job) {
      throw new Error("Job not found or access denied");
    }
    
    const createdCandidates: Candidate[] = [];

    for (const file of files) {
      if (!file.filename.toLowerCase().endsWith(".pdf")) {
        continue;
      }

      // Create candidate ID first so we can use it for file storage
      const candidateId = randomUUID();

      // Store PDF file
      try {
        await this.storageService.storePDF(candidateId, file.filename, file.content);
        console.log(`✅ Stored PDF for candidate ${candidateId}: ${file.filename}`);
      } catch (error) {
        console.error(`❌ Failed to store PDF for candidate ${candidateId}:`, error);
        // Continue anyway - we'll still create the candidate record
      }

      // Extract text from PDF
      let cvText: string;
      try {
        cvText = await PDFParser.extractText(file.content, file.filename);
      } catch (error) {
        // Create candidate with error status
        const errorCandidate: NewCandidate = {
          id: candidateId,
          jobId,
          cvFilename: file.filename,
          cvRawText: `Error parsing PDF: ${error instanceof Error ? error.message : String(error)}`,
          status: "PENDING",
        };
        const [candidate] = await db.insert(candidates).values(errorCandidate).returning();
        await this.createAuditLog(candidate.id, "cv_upload_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        createdCandidates.push(candidate);
        continue;
      }

      // Create candidate record
      const newCandidate: NewCandidate = {
        id: candidateId,
        jobId,
        cvFilename: file.filename,
        cvRawText: cvText,
        status: "PENDING",
        promptVersion: PROMPT_VERSION,
      };
      const [candidate] = await db.insert(candidates).values(newCandidate).returning();

      await this.createAuditLog(candidate.id, "cv_uploaded", { filename: file.filename });
      createdCandidates.push(candidate);
    }

    return createdCandidates;
  }

  /**
   * Get PDF file for a candidate
   */
  async getPDF(candidateId: string, filename: string): Promise<Buffer | null> {
    return await this.storageService.getPDF(candidateId, filename);
  }

  /**
   * Check if PDF exists for a candidate
   */
  async pdfExists(candidateId: string, filename: string): Promise<boolean> {
    return await this.storageService.pdfExists(candidateId, filename);
  }

  async parseCvBackground(userId: string, candidateId: string): Promise<void> {
    try {
      console.log(`🔄 [Background] Starting CV parsing for candidate ${candidateId}...`);
      
      // Verify candidate belongs to user
      const [result] = await db
        .select({ candidate: candidates })
        .from(candidates)
        .innerJoin(jobs, eq(candidates.jobId, jobs.id))
        .where(and(eq(candidates.id, candidateId), eq(jobs.userId, userId)));
      
      if (!result) {
        console.log(`❌ [Background] Candidate ${candidateId} not found or doesn't belong to user`);
        return;
      }
      
      const candidate = result.candidate;

      if (candidate.profile) {
        console.log(`✅ [Background] Candidate ${candidateId} already has profile, skipping`);
        return;
      }

      console.log(`🔄 [Background] Candidate found, checking API keys...`);

      // Check if API keys are configured
      if (settings.llmProvider === "openai" && !settings.openaiApiKey) {
        const error = "OPENAI_API_KEY not configured in .env file";
        console.error(`❌ [Background] ${error}`);
        await this.createAuditLog(candidateId, "cv_parse_failed", { error });
        throw new Error(error);
      } else if (settings.llmProvider === "anthropic" && !settings.anthropicApiKey) {
        const error = "ANTHROPIC_API_KEY not configured in .env file";
        console.error(`❌ [Background] ${error}`);
        await this.createAuditLog(candidateId, "cv_parse_failed", { error });
        throw new Error(error);
      }

      console.log(`🔄 [Background] API keys configured, starting RAG pipeline...`);
      
      // Step 1: Chunk the CV
      console.log(`🔄 [Background] Chunking CV text (${candidate.cvRawText.length} chars)...`);
      const chunkingService = new CVChunkingService();
      const chunks = chunkingService.chunkCV(candidate.cvRawText, candidateId);
      console.log(`✅ [Background] Created ${chunks.length} chunks`);

      // Step 2: Embed and store chunks in Pinecone
      let vectorStore: VectorStoreService | null = null;
      try {
        if (settings.pineconeApiKey) {
          console.log(`🔄 [Background] Embedding and storing chunks in Pinecone...`);
          vectorStore = new VectorStoreService();
          await vectorStore.upsertChunks(candidateId, chunks);
          console.log(`✅ [Background] Chunks stored in Pinecone`);
        } else {
          console.warn(`⚠️ [Background] PINECONE_API_KEY not configured, skipping vector storage`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ [Background] Error storing chunks in Pinecone:`, errorMsg);
        
        // If index doesn't exist, provide helpful message
        if (errorMsg.includes("not found") || errorMsg.includes("404")) {
          console.error(`\n⚠️ IMPORTANT: Pinecone index "${settings.pineconeIndexName}" does not exist!`);
          console.error(`   Please create it in Pinecone dashboard with:`);
          console.error(`   - Name: ${settings.pineconeIndexName}`);
          console.error(`   - Dimension: ${settings.embeddingDimension}`);
          console.error(`   - Metric: cosine (recommended) or euclidean\n`);
        }
        
        // Continue with parsing even if Pinecone fails (graceful degradation)
        vectorStore = null;
      }

      // Step 3: Retrieve relevant chunks for parsing
      console.log(`🔄 [Background] Retrieving relevant chunks for parsing...`);
      let retrievedChunks: any[] = [];
      
      if (vectorStore) {
        try {
          // Retrieve chunks for different aspects
          // Get general chunks for overall parsing
          const generalChunks = await vectorStore.searchRelevantChunks(
            candidateId,
            "skills experience education certifications work history professional background",
            10 // Get top 10 chunks for comprehensive coverage
          );
          retrievedChunks = generalChunks;
          console.log(`✅ [Background] Retrieved ${retrievedChunks.length} relevant chunks`);
        } catch (error) {
          console.error(`❌ [Background] Error retrieving chunks:`, error);
          // Fallback: use first few chunks if retrieval fails
          retrievedChunks = chunks.slice(0, 5).map((chunk, idx) => ({
            chunkIndex: chunk.chunkIndex,
            text: chunk.text,
            sectionType: chunk.sectionType,
            metadata: chunk.metadata,
            score: 1.0,
          }));
        }
      } else {
        // No Pinecone: use chunks directly (fallback)
        console.log(`⚠️ [Background] Using chunks directly (no Pinecone)`);
        retrievedChunks = chunks.slice(0, 10).map((chunk) => ({
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          sectionType: chunk.sectionType,
          metadata: chunk.metadata,
          score: 1.0,
        }));
      }

      // Step 4: Parse with RAG
      console.log(`🔄 [Background] Parsing CV with RAG (${retrievedChunks.length} chunks)...`);
      const llmClient = new LLMClient();
      const profile = await llmClient.parseCvToProfileWithRAG(
        candidateId,
        candidate.cvRawText,
        retrievedChunks
      );
      console.log(`✅ [Background] LLM response received, updating database...`);

      await db
        .update(candidates)
        .set({
          profile,
          name: (profile.name as string) || null,
          email: (profile.email as string) || null,
          phone: (profile.phone as string) || null,
        })
        .where(eq(candidates.id, candidateId));

      // Create audit log
      await this.createAuditLog(candidateId, "cv_parsed", {
        name: (profile.name as string) || null,
        email: (profile.email as string) || null,
      });

      console.log(`✅ [Background] Successfully parsed CV for candidate ${candidateId} - ${profile.name || "Unknown"}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorTrace = error instanceof Error ? error.stack : "";
      console.error(`❌ [Background] Error parsing CV for candidate ${candidateId}: ${errorMsg}`);
      if (errorTrace) {
        console.error(`❌ [Background] Stack trace: ${errorTrace}`);
      }

      try {
        await this.createAuditLog(candidateId, "cv_parse_failed", { error: errorMsg });
      } catch (commitError) {
        console.error(`❌ [Background] Failed to log error: ${commitError}`);
      }
      // Re-throw to ensure error is propagated
      throw error;
    }
  }

  async listCandidates(
    userId: string,
    jobId: string,
    statusFilter?: string | null,
    decisionFilter?: string | null
  ): Promise<Candidate[]> {
    // Verify job belongs to user
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));
    if (!job) {
      return []; // Job doesn't exist or doesn't belong to user
    }
    let result: Candidate[];

    if (statusFilter) {
      const statusEnum = statusFilter as CandidateStatus;
      result = await db
        .select()
        .from(candidates)
        .where(and(eq(candidates.jobId, jobId), eq(candidates.status, statusEnum)))
        .orderBy(desc(candidates.createdAt));
    } else {
      result = await db
        .select()
        .from(candidates)
        .where(eq(candidates.jobId, jobId))
        .orderBy(desc(candidates.createdAt));
    }

    if (decisionFilter) {
      // Filter by evaluation decision - requires join
      const candidateIds = result.map((c) => c.id);
      if (candidateIds.length === 0) {
        return [];
      }
      const evals = await db
        .select()
        .from(evaluations)
        .where(
          and(
            inArray(evaluations.candidateId, candidateIds),
            eq(evaluations.decision, (decisionFilter.toUpperCase() as "YES" | "MAYBE" | "NO"))
          )
        );

      const evalCandidateIds = new Set(evals.map((e) => e.candidateId));
      return result.filter((c) => evalCandidateIds.has(c.id));
    }

    return result;
  }

  async getCandidate(userId: string, candidateId: string): Promise<Candidate | null> {
    const [result] = await db
      .select({ candidate: candidates })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(and(eq(candidates.id, candidateId), eq(jobs.userId, userId)));
    return result?.candidate || null;
  }

  /**
   * Get all candidates across all jobs with their evaluations and job titles for a specific user
   */
  async getAllCandidatesWithEvaluations(userId: string): Promise<Array<Candidate & { jobTitle: string; evaluation: any | null }>> {
    const allCandidates = await db
      .select({
        candidate: candidates,
        jobTitle: jobs.title,
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(eq(jobs.userId, userId))
      .orderBy(desc(candidates.createdAt));

    // Get all evaluations for these candidates
    const candidateIds = allCandidates.map((c) => c.candidate.id);
    const allEvaluations = candidateIds.length > 0
      ? await db
          .select()
          .from(evaluations)
          .where(inArray(evaluations.candidateId, candidateIds))
      : [];

    // Create a map of candidateId -> evaluation
    const evaluationMap = new Map(allEvaluations.map((e) => [e.candidateId, e]));

    // Combine candidates with their evaluations and job titles
    return allCandidates.map(({ candidate, jobTitle }) => ({
      ...candidate,
      jobTitle: jobTitle || "Unknown Job",
      evaluation: evaluationMap.get(candidate.id) || null,
    }));
  }

  async deleteCandidate(userId: string, candidateId: string): Promise<boolean> {
    // Get candidate first and verify it belongs to user's job
    const [result] = await db
      .select({ candidate: candidates })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(and(eq(candidates.id, candidateId), eq(jobs.userId, userId)));
    
    if (!result) {
      return false; // Candidate doesn't exist or doesn't belong to user
    }
    
    const candidate = result.candidate;
    
    // Delete PDF file if candidate exists
    if (candidate) {
      try {
        await this.storageService.deletePDF(candidateId, candidate.cvFilename);
      } catch (error) {
        console.error(`Error deleting PDF for candidate ${candidateId}:`, error);
        // Continue with candidate deletion even if PDF deletion fails
      }
    }

    // Delete chunks from Pinecone if configured
    if (settings.pineconeApiKey) {
      try {
        const vectorStore = new VectorStoreService();
        await vectorStore.deleteCandidateChunks(candidateId);
      } catch (error) {
        console.error(`Error deleting chunks for candidate ${candidateId}:`, error);
        // Continue with candidate deletion even if chunk deletion fails
      }
    }

    // Delete related records first (to satisfy foreign key constraints)
    // Order matters: delete child records before parent
    try {
      // Get evaluation IDs for this candidate
      const candidateEvaluations = await db
        .select({ id: evaluations.id })
        .from(evaluations)
        .where(eq(evaluations.candidateId, candidateId));
      
      const evaluationIds = candidateEvaluations.map(e => e.id);
      
      // Delete email drafts (if any evaluations exist)
      if (evaluationIds.length > 0) {
        await db.delete(emailDrafts).where(inArray(emailDrafts.evaluationId, evaluationIds));
      }
      
      // Delete evaluations
      await db.delete(evaluations).where(eq(evaluations.candidateId, candidateId));
      
      // Delete audit logs
      await db.delete(auditLogs).where(eq(auditLogs.candidateId, candidateId));
      
      // Finally, delete the candidate
      await db.delete(candidates).where(eq(candidates.id, candidateId));
      
      return true;
    } catch (error) {
      console.error(`Error deleting candidate ${candidateId}:`, error);
      throw error;
    }
  }

  private async createAuditLog(
    candidateId: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const log: NewAuditLog = {
      id: randomUUID(),
      candidateId,
      action,
      actionMetadata: metadata || {},
    };
    await db.insert(auditLogs).values(log);
  }
}
