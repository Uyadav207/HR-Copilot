import { eq, desc, inArray, and } from "drizzle-orm";
import { db } from "../database.js";
import { jobs, type Job, type NewJob } from "../models/job.js";
import { candidates } from "../models/candidate.js";
import { auditLogs } from "../models/auditLog.js";
import { evaluations } from "../models/evaluation.js";
import { emailDrafts } from "../models/emailDraft.js";
import { LLMClient } from "./llmClient.js";
import { PROMPT_VERSION } from "../prompts/registry.js";
import { settings } from "../config.js";
import { randomUUID } from "crypto";

export class JobService {
  async createJob(userId: string, jobData: { title: string; rawDescription: string }): Promise<Job> {
    const newJob: NewJob = {
      id: randomUUID(),
      userId,
      title: jobData.title,
      rawDescription: jobData.rawDescription,
      promptVersion: PROMPT_VERSION,
      blueprint: null,
    };

    const [job] = await db.insert(jobs).values(newJob).returning();

    // Parse JD to blueprint
    console.log(`🔄 Starting blueprint parsing for job ${job.id}...`);

    // Check if API keys are configured
    if (settings.llmProvider === "openai" && !settings.openaiApiKey) {
      const errorMsg = "OPENAI_API_KEY not configured in .env file";
      console.log(`❌ ${errorMsg}`);
      return job;
    } else if (settings.llmProvider === "anthropic" && !settings.anthropicApiKey) {
      const errorMsg = "ANTHROPIC_API_KEY not configured in .env file";
      console.log(`❌ ${errorMsg}`);
      return job;
    } else if (settings.llmProvider === "gemini" && !settings.geminiApiKey) {
      const errorMsg = "GEMINI_API_KEY not configured in .env file";
      console.log(`❌ ${errorMsg}`);
      return job;
    }

    try {
      const llmClient = new LLMClient();
      const blueprint = await llmClient.parseJdToBlueprint(jobData.rawDescription);
      await db.update(jobs).set({ blueprint }).where(eq(jobs.id, job.id));
      console.log(`✅ Successfully parsed blueprint for job ${job.id}`);
      const [updated] = await db.select().from(jobs).where(eq(jobs.id, job.id));
      return updated!;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorTrace = error instanceof Error ? error.stack : "";
      console.log(`❌ Error parsing JD for job ${job.id}: ${errorMsg}`);
      if (errorTrace) {
        console.log(`Traceback: ${errorTrace}`);
      }
      return job;
    }
  }

  async listJobs(userId: string): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt));
  }

  async getJob(userId: string, jobId: string): Promise<Job | null> {
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));
    return job || null;
  }

  async updateJob(
    userId: string,
    jobId: string,
    jobData: { title?: string; rawDescription?: string }
  ): Promise<Job | null> {
    const job = await this.getJob(userId, jobId);
    if (!job) {
      return null;
    }

    const updateData: Partial<NewJob> = {};
    if (jobData.title !== undefined) {
      updateData.title = jobData.title;
    }
    if (jobData.rawDescription !== undefined) {
      updateData.rawDescription = jobData.rawDescription;
      // Re-parse blueprint if description changed
      if (jobData.rawDescription !== job.rawDescription) {
        console.log(`🔄 Re-parsing blueprint for job ${job.id}...`);
        if (settings.llmProvider === "openai" && !settings.openaiApiKey) {
          console.log(`❌ OPENAI_API_KEY not configured`);
        } else if (settings.llmProvider === "anthropic" && !settings.anthropicApiKey) {
          console.log(`❌ ANTHROPIC_API_KEY not configured`);
        } else if (settings.llmProvider === "gemini" && !settings.geminiApiKey) {
          console.log(`❌ GEMINI_API_KEY not configured`);
        } else {
          try {
            const llmClient = new LLMClient();
            const blueprint = await llmClient.parseJdToBlueprint(jobData.rawDescription);
            updateData.blueprint = blueprint;
            updateData.promptVersion = PROMPT_VERSION;
            console.log(`✅ Successfully re-parsed blueprint for job ${job.id}`);
          } catch (error) {
            console.log(`❌ Error re-parsing JD for job ${job.id}: ${error}`);
            if (error instanceof Error && error.stack) {
              console.log(`Traceback: ${error.stack}`);
            }
          }
        }
      }
    }

    const [updated] = await db
      .update(jobs)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
      .returning();
    return updated || null;
  }

  async parseBlueprint(userId: string, jobId: string): Promise<Job | null> {
    const job = await this.getJob(userId, jobId);
    if (!job) {
      return null;
    }

    console.log(`🔄 Manually parsing blueprint for job ${jobId}...`);

    if (settings.llmProvider === "openai" && !settings.openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured in .env file");
    } else if (settings.llmProvider === "anthropic" && !settings.anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured in .env file");
    } else if (settings.llmProvider === "gemini" && !settings.geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured in .env file");
    }

    try {
      const llmClient = new LLMClient();
      const blueprint = await llmClient.parseJdToBlueprint(job.rawDescription);
      const [updated] = await db
        .update(jobs)
        .set({ blueprint, promptVersion: PROMPT_VERSION })
        .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
        .returning();
      console.log(`✅ Successfully parsed blueprint for job ${jobId}`);
      return updated || null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorTrace = error instanceof Error ? error.stack : "";
      console.log(`❌ Error parsing blueprint for job ${jobId}: ${errorMsg}`);
      if (errorTrace) {
        console.log(`Traceback: ${errorTrace}`);
      }
      throw error;
    }
  }

  async deleteJob(userId: string, jobId: string): Promise<boolean> {
    // Check if job exists and belongs to user
    const job = await this.getJob(userId, jobId);
    if (!job) {
      return false;
    }

    // Get all candidates for this job
    const jobCandidates = await db
      .select()
      .from(candidates)
      .where(eq(candidates.jobId, jobId));

    if (jobCandidates.length > 0) {
      const candidateIds = jobCandidates.map((c) => c.id);

      // Get all evaluations for these candidates
      const jobEvaluations = await db
        .select()
        .from(evaluations)
        .where(inArray(evaluations.candidateId, candidateIds));

      if (jobEvaluations.length > 0) {
        const evaluationIds = jobEvaluations.map((e) => e.id);

        // Delete email drafts for all evaluations
        await db.delete(emailDrafts).where(inArray(emailDrafts.evaluationId, evaluationIds));
      }

      // Delete audit logs for all candidates
      await db.delete(auditLogs).where(inArray(auditLogs.candidateId, candidateIds));

      // Delete evaluations for all candidates
      await db.delete(evaluations).where(inArray(evaluations.candidateId, candidateIds));

      // Delete all candidates for this job
      await db.delete(candidates).where(eq(candidates.jobId, jobId));
    }

    // Finally, delete the job (userId already verified in getJob)
    await db.delete(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));
    return true;
  }
}
