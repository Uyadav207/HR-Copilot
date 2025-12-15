import { eq, desc, and } from "drizzle-orm";
import { db } from "../database.js";
import {
  evaluations,
  type Evaluation,
  type NewEvaluation,
  type FinalDecision,
} from "../models/evaluation.js";
import { candidates, type CandidateStatus } from "../models/candidate.js";
import { jobs } from "../models/job.js";
import { emailDrafts, type NewEmailDraft, type EmailType } from "../models/emailDraft.js";
import { auditLogs, type NewAuditLog } from "../models/auditLog.js";
import { LLMClient } from "./llmClient.js";
import { PROMPT_VERSION } from "../prompts/registry.js";
import { randomUUID } from "crypto";

export class EvaluationService {
  async evaluateCandidate(candidateId: string): Promise<Evaluation | null> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    if (!candidate) {
      return null;
    }

    if (!candidate.profile) {
      throw new Error("Candidate profile not parsed yet");
    }

    // Get job blueprint
    const [job] = await db.select().from(jobs).where(eq(jobs.id, candidate.jobId));
    if (!job || !job.blueprint) {
      throw new Error("Job blueprint not available");
    }

    // Check if evaluation already exists
    const [existing] = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.candidateId, candidateId));

    if (existing) {
      return existing;
    }

    // Run evaluation
    const llmClient = new LLMClient();
    let evaluationData: Record<string, any>;
    try {
      evaluationData = await llmClient.evaluateCandidate(job.blueprint, candidate.profile);
    } catch (error) {
      throw new Error(`Failed to evaluate candidate: ${error}`);
    }

    // Create evaluation record
    // Convert LLM response (lowercase) to database enum (uppercase)
    const decisionUpper = (evaluationData.decision as string).toUpperCase() as EvaluationDecision;
    const newEvaluation: NewEvaluation = {
      id: randomUUID(),
      candidateId,
      decision: decisionUpper,
      confidence: evaluationData.confidence as number,
      criteriaMatches: evaluationData.criteria_matches as Record<string, any>[],
      strengths: evaluationData.strengths as Record<string, any>[],
      concerns: evaluationData.concerns as Record<string, any>[],
      redFlagsFound: evaluationData.red_flags_found as Record<string, any>[],
      summary: evaluationData.summary as string,
      recommendedQuestions: evaluationData.recommended_interview_questions as string[],
      promptVersion: PROMPT_VERSION,
    };

    const [evaluation] = await db.insert(evaluations).values(newEvaluation).returning();

    // Update candidate status
    await db.update(candidates).set({ status: "EVALUATED" }).where(eq(candidates.id, candidateId));

    // Create audit log
    const log: NewAuditLog = {
      id: randomUUID(),
      candidateId,
      action: "evaluated",
      actionMetadata: {
        decision: evaluationData.decision,
        confidence: evaluationData.confidence,
      },
    };
    await db.insert(auditLogs).values(log);

    return evaluation;
  }

  async getEvaluation(candidateId: string): Promise<Evaluation | null> {
    const [evaluation] = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.candidateId, candidateId));
    return evaluation || null;
  }

  async updateDecision(evaluationId: string, finalDecision: string): Promise<Evaluation | null> {
    const [evaluation] = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.id, evaluationId));
    if (!evaluation) {
      return null;
    }

    // Convert finalDecision from lowercase (API) to uppercase (DB enum)
    const finalDecisionUpper = finalDecision.toUpperCase() as FinalDecision;
    await db
      .update(evaluations)
      .set({
        finalDecision: finalDecisionUpper,
        decidedAt: new Date(),
      })
      .where(eq(evaluations.id, evaluationId));

    // Update candidate status
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, evaluation.candidateId));

    if (candidate) {
      let newStatus: CandidateStatus = "PENDING";
      if (finalDecisionUpper === "INVITED") {
        newStatus = "INVITED";
      } else if (finalDecisionUpper === "REJECTED") {
        newStatus = "REJECTED";
      } else if (finalDecisionUpper === "ON_HOLD") {
        newStatus = "ON_HOLD";
      }

      await db.update(candidates).set({ status: newStatus }).where(eq(candidates.id, candidate.id));
    }

    // Create audit log
    const log: NewAuditLog = {
      id: randomUUID(),
      candidateId: evaluation.candidateId,
      action: `decision_${finalDecision}`,
      actionMetadata: { evaluation_id: evaluationId },
    };
    await db.insert(auditLogs).values(log);

    const [updated] = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.id, evaluationId));
    return updated || null;
  }

  async generateEmailDraft(evaluationId: string, emailType: string): Promise<any | null> {
    const [evaluation] = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.id, evaluationId));
    if (!evaluation) {
      return null;
    }

    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, evaluation.candidateId));
    if (!candidate) {
      return null;
    }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, candidate.jobId));
    if (!job) {
      return null;
    }

    // Prepare data for email generation
    const candidateName = candidate.name || "Candidate";
    const jobTitle = job.title;
    const evaluationSummary = evaluation.summary;

    // Extract key strengths/concerns for rejection emails
    const strengths = (evaluation.strengths || []) as Array<{ point?: string }>;
    const concerns = (evaluation.concerns || []) as Array<{ point?: string }>;
    const keyStrengths = strengths.map((s) => s.point || "").filter(Boolean).join(", ");
    
    // For rejection emails, provide detailed concerns for constructive feedback
    let mainConcerns = "";
    if (emailType === "reject") {
      const detailedConcerns = concerns.map((c) => {
        const point = c.point || "";
        const evidence = (c as any).evidence || "";
        return point + (evidence ? ` (${evidence})` : "");
      }).filter(Boolean);
      
      // Also include criteria matches that were weak for transparency
      const criteriaMatches = (evaluation.criteriaMatches || []) as Array<{
        criterion?: string;
        score?: number;
        matched?: boolean;
        reasoning?: string;
      }>;
      const weakAreas = criteriaMatches
        .filter((c) => !c.matched || (c.score && c.score < 0.5))
        .map((c) => `${c.criterion || "Unknown area"}: ${c.reasoning || "Did not meet requirements"}`)
        .filter(Boolean);
      
      // Combine all feedback for comprehensive rejection email
      const allFeedback = [
        ...detailedConcerns,
        ...(weakAreas.length > 0 ? [`Areas needing improvement: ${weakAreas.join("; ")}`] : [])
      ];
      
      mainConcerns = allFeedback.join(". ");
    } else {
      // For other email types, use simpler concerns
      mainConcerns = concerns.slice(0, 2).map((c) => c.point || "").join(", ");
    }

    // Get hiring manager from config
    const { settings } = await import("../config.js");
    const hiringManager = settings.hiringManager;

    // Generate email
    const llmClient = new LLMClient();
    let emailData: Record<string, any>;
    try {
      emailData = await llmClient.generateEmail(
        emailType,
        jobTitle,
        candidateName,
        evaluationSummary,
        emailType === "invite" ? keyStrengths : null,
        emailType === "reject" ? mainConcerns : null,
        emailType === "hold" ? "We're still evaluating candidates" : null,
        emailType === "invite" ? hiringManager : null
      );
    } catch (error) {
      throw new Error(`Failed to generate email: ${error}`);
    }

    // Create email draft
    // Convert emailType from lowercase (API) to uppercase (DB enum)
    const emailTypeUpper = emailType.toUpperCase() as EmailType;
    const newEmailDraft: NewEmailDraft = {
      id: randomUUID(),
      evaluationId,
      emailType: emailTypeUpper,
      subject: emailData.subject as string,
      body: emailData.body as string,
    };

    const [emailDraft] = await db.insert(emailDrafts).values(newEmailDraft).returning();
    return emailDraft;
  }

  async getEmailDraft(evaluationId: string, emailType: string): Promise<any | null> {
    // Convert emailType from lowercase (API) to uppercase (DB enum)
    const emailTypeUpper = emailType.toUpperCase() as EmailType;
    const [emailDraft] = await db
      .select()
      .from(emailDrafts)
      .where(
        and(
          eq(emailDrafts.evaluationId, evaluationId),
          eq(emailDrafts.emailType, emailTypeUpper)
        )
      )
      .orderBy(desc(emailDrafts.createdAt))
      .limit(1);
    return emailDraft || null;
  }
}
