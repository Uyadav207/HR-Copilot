import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { EvaluationService } from "../services/evaluationService.js";
import { EmailService } from "../services/emailService.js";
import {
  EvaluationDecisionUpdateSchema,
  EmailDraftRequestSchema,
} from "../schemas/evaluation.js";
import { toSnakeCaseResponse } from "../utils/transform.js";
import { db } from "../database.js";
import { candidates } from "../models/candidate.js";
import { evaluations as evaluationsTable } from "../models/evaluation.js";
import { eq } from "drizzle-orm";

const evaluations = new Hono();
const evaluationService = new EvaluationService();
const emailService = new EmailService();

evaluations.post("/candidates/:candidateId/evaluate", async (c) => {
  const candidateId = c.req.param("candidateId");
  try {
    const evaluation = await evaluationService.evaluateCandidate(candidateId);
    if (!evaluation) {
      return c.json({ error: "Candidate not found" }, 404);
    }
    return c.json(toSnakeCaseResponse(evaluation), 201);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to evaluate candidate" }, 500);
  }
});

evaluations.get("/candidates/:candidateId/evaluation", async (c) => {
  const candidateId = c.req.param("candidateId");
  const evaluation = await evaluationService.getEvaluation(candidateId);
  return c.json(toSnakeCaseResponse(evaluation));
});

evaluations.patch(
  "/evaluations/:id/decision",
  zValidator("json", EvaluationDecisionUpdateSchema),
  async (c) => {
    const id = c.req.param("id");
    const { decision } = c.req.valid("json");
    const evaluation = await evaluationService.updateDecision(id, decision);
    if (!evaluation) {
      return c.json({ error: "Evaluation not found" }, 404);
    }
    return c.json(toSnakeCaseResponse(evaluation));
  }
);

evaluations.post(
  "/evaluations/:id/email-draft",
  async (c) => {
    const id = c.req.param("id");
    console.log(`📧 Generating email draft for evaluation ${id}`);
    
    // Parse request body manually to provide better error messages
    let body: any;
    try {
      body = await c.req.json();
      console.log(`📧 Request body received:`, body);
    } catch (error) {
      console.error("❌ Error parsing JSON:", error);
      return c.json({ 
        error: "Invalid JSON in request body",
        details: error instanceof Error ? error.message : "Request body must be valid JSON"
      }, 400);
    }

    // Validate email_type
    const emailType = body?.email_type;
    if (!emailType) {
      return c.json({ 
        error: "Missing email_type",
        details: "email_type is required. Expected format: { \"email_type\": \"invite\" | \"reject\" | \"hold\" }"
      }, 400);
    }

    if (typeof emailType !== "string") {
      return c.json({ 
        error: "Invalid email_type type",
        details: `email_type must be a string. Received: ${typeof emailType}`
      }, 400);
    }

    if (!["invite", "reject", "hold"].includes(emailType)) {
      return c.json({ 
        error: "Invalid email_type value",
        details: `email_type must be one of: 'invite', 'reject', 'hold'. Received: '${emailType}'`
      }, 400);
    }

    console.log(`✅ Valid email_type: ${emailType}, generating draft...`);
    
    try {
      const emailDraft = await evaluationService.generateEmailDraft(id, emailType);
      if (!emailDraft) {
        return c.json({ error: "Evaluation not found" }, 404);
      }
      console.log(`✅ Email draft generated successfully`);
      return c.json(toSnakeCaseResponse(emailDraft), 201);
    } catch (error) {
      console.error("❌ Error generating email draft:", error);
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to generate email draft" }, 500);
    }
  }
);

evaluations.get("/evaluations/:id/email-draft", async (c) => {
  const id = c.req.param("id");
  const emailType = c.req.query("email_type");
  if (!emailType) {
    return c.json({ error: "email_type query parameter is required" }, 400);
  }
  const emailDraft = await evaluationService.getEmailDraft(id, emailType);
  if (!emailDraft) {
    return c.json({ error: "Email draft not found" }, 404);
  }
  return c.json(toSnakeCaseResponse(emailDraft));
});

evaluations.post("/evaluations/:id/send-email", async (c) => {
  const id = c.req.param("id");
  const emailType = c.req.query("email_type");
  
  if (!emailType) {
    return c.json({ error: "email_type query parameter is required" }, 400);
  }

  try {
    // Get the evaluation first
    const [evaluationRecord] = await db
      .select()
      .from(evaluationsTable)
      .where(eq(evaluationsTable.id, id))
      .limit(1);
    
    if (!evaluationRecord) {
      return c.json({ error: "Evaluation not found" }, 404);
    }

    // Get the email draft
    const emailDraft = await evaluationService.getEmailDraft(id, emailType);
    if (!emailDraft) {
      return c.json({ error: "Email draft not found. Please generate the email draft first." }, 404);
    }

    // Get the candidate
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, evaluationRecord.candidateId))
      .limit(1);

    if (!candidate) {
      return c.json({ error: "Candidate not found" }, 404);
    }

    if (!candidate.email) {
      return c.json({ error: "Candidate email not found. Cannot send email." }, 400);
    }

    // Send the email
    await emailService.sendEmailDraft(
      candidate.email,
      emailDraft.subject,
      emailDraft.body
    );

    return c.json({
      message: "Email sent successfully",
      to: candidate.email,
      subject: emailDraft.subject,
      email_type: emailType,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      500
    );
  }
});

export default evaluations;
