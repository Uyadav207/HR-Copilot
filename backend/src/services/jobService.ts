import { eq, desc } from "drizzle-orm";
import { db } from "../database.js";
import { jobs, type Job, type NewJob } from "../models/job.js";
import { LLMClient } from "./llmClient.js";
import { PROMPT_VERSION } from "../prompts/registry.js";
import { settings } from "../config.js";
import { randomUUID } from "crypto";

export class JobService {
  async createJob(jobData: { title: string; rawDescription: string }): Promise<Job> {
    const newJob: NewJob = {
      id: randomUUID(),
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

  async listJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJob(jobId: string): Promise<Job | null> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    return job || null;
  }

  async updateJob(
    jobId: string,
    jobData: { title?: string; rawDescription?: string }
  ): Promise<Job | null> {
    const job = await this.getJob(jobId);
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
      .where(eq(jobs.id, jobId))
      .returning();
    return updated || null;
  }

  async parseBlueprint(jobId: string): Promise<Job | null> {
    const job = await this.getJob(jobId);
    if (!job) {
      return null;
    }

    console.log(`🔄 Manually parsing blueprint for job ${jobId}...`);

    if (settings.llmProvider === "openai" && !settings.openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured in .env file");
    } else if (settings.llmProvider === "anthropic" && !settings.anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured in .env file");
    }

    try {
      const llmClient = new LLMClient();
      const blueprint = await llmClient.parseJdToBlueprint(job.rawDescription);
      const [updated] = await db
        .update(jobs)
        .set({ blueprint, promptVersion: PROMPT_VERSION })
        .where(eq(jobs.id, jobId))
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

  async deleteJob(jobId: string): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.id, jobId));
    return true;
  }
}
