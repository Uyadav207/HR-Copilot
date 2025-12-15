import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { JobService } from "../services/jobService.js";
import { JobCreateSchema, JobUpdateSchema } from "../schemas/job.js";
import { toSnakeCaseResponse } from "../utils/transform.js";

const jobs = new Hono();
const jobService = new JobService();

jobs.post("/jobs", zValidator("json", JobCreateSchema), async (c) => {
  const jobData = c.req.valid("json");
  const job = await jobService.createJob({
    title: jobData.title,
    rawDescription: jobData.raw_description,
  });
  return c.json(toSnakeCaseResponse(job), 201);
});

jobs.get("/jobs", async (c) => {
  const jobsList = await jobService.listJobs();
  return c.json(toSnakeCaseResponse(jobsList));
});

jobs.get("/jobs/:id", async (c) => {
  const id = c.req.param("id");
  const job = await jobService.getJob(id);
  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }
  return c.json(toSnakeCaseResponse(job));
});

jobs.put("/jobs/:id", zValidator("json", JobUpdateSchema), async (c) => {
  const id = c.req.param("id");
  const jobData = c.req.valid("json");
  const job = await jobService.updateJob(id, {
    title: jobData.title,
    rawDescription: jobData.raw_description,
  });
  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }
  return c.json(toSnakeCaseResponse(job));
});

jobs.post("/jobs/:id/parse-blueprint", async (c) => {
  const id = c.req.param("id");
  try {
    const job = await jobService.parseBlueprint(id);
    if (!job) {
      return c.json({ error: "Job not found" }, 404);
    }
    return c.json(toSnakeCaseResponse(job));
  } catch (error) {
    if (error instanceof Error && error.message.includes("not configured")) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: `Failed to parse blueprint: ${error}` }, 500);
  }
});

jobs.post("/jobs/generate-description", async (c) => {
  try {
    const body = await c.req.json();
    const { message, conversation_history, job_title } = body;

    if (!message || typeof message !== "string") {
      return c.json({ error: "Message is required" }, 400);
    }

    const { LLMClient } = await import("../services/llmClient.js");
    const llmClient = new LLMClient();

    const jobDescription = await llmClient.generateJobDescription(
      message,
      conversation_history || [],
      job_title
    );

    return c.json({ job_description: jobDescription });
  } catch (error) {
    console.error("Error generating job description:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate job description",
      },
      500
    );
  }
});

jobs.delete("/jobs/:id", async (c) => {
  const id = c.req.param("id");
  const success = await jobService.deleteJob(id);
  if (!success) {
    return c.json({ error: "Job not found" }, 404);
  }
  return c.body(null, 204);
});

export default jobs;
