import { eq, and, inArray, desc } from "drizzle-orm";
import { db } from "../database.js";
import { candidates, type Candidate, type NewCandidate, type CandidateStatus } from "../models/candidate.js";
import { auditLogs, type NewAuditLog } from "../models/auditLog.js";
import { PDFParser } from "./pdfParser.js";
import { LLMClient } from "./llmClient.js";
import { PROMPT_VERSION } from "../prompts/registry.js";
import { settings } from "../config.js";
import { evaluations } from "../models/evaluation.js";
import { randomUUID } from "crypto";

export class CandidateService {
  async uploadCandidates(
    jobId: string,
    files: Array<{ filename: string; content: Buffer }>
  ): Promise<Candidate[]> {
    const createdCandidates: Candidate[] = [];

    for (const file of files) {
      if (!file.filename.toLowerCase().endsWith(".pdf")) {
        continue;
      }

      // Extract text from PDF
      let cvText: string;
      try {
        cvText = await PDFParser.extractText(file.content, file.filename);
      } catch (error) {
        // Create candidate with error status
        const errorCandidate: NewCandidate = {
          id: randomUUID(),
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
        id: randomUUID(),
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

  async parseCvBackground(candidateId: string): Promise<void> {
    try {
      console.log(`🔄 [Background] Starting CV parsing for candidate ${candidateId}...`);
      
      const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
      if (!candidate) {
        console.log(`❌ [Background] Candidate ${candidateId} not found for parsing`);
        return;
      }

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

      console.log(`🔄 [Background] API keys configured, calling LLM...`);
      const llmClient = new LLMClient();
      
      console.log(`🔄 [Background] Parsing CV text (${candidate.cvRawText.length} chars)...`);
      const profile = await llmClient.parseCvToProfile(candidate.cvRawText);
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
    jobId: string,
    statusFilter?: string | null,
    decisionFilter?: string | null
  ): Promise<Candidate[]> {
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

  async getCandidate(candidateId: string): Promise<Candidate | null> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    return candidate || null;
  }

  async deleteCandidate(candidateId: string): Promise<boolean> {
    const result = await db.delete(candidates).where(eq(candidates.id, candidateId));
    return true;
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
