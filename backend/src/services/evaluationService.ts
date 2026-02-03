/**
 * AI evaluation lifecycle: run evaluations (direct or RAG), persist results,
 * update decisions, generate and send email drafts. Uses LLMClient for all LLM calls.
 */
import { eq, desc, and } from "drizzle-orm";
import { db } from "../database.js";
import {
  evaluations,
  type Evaluation,
  type NewEvaluation,
  type EvaluationDecision,
  type FinalDecision,
} from "../models/evaluation.js";
import { candidates, type CandidateStatus } from "../models/candidate.js";
import { jobs } from "../models/job.js";
import { emailDrafts, type NewEmailDraft, type EmailType } from "../models/emailDraft.js";
import { auditLogs, type NewAuditLog } from "../models/auditLog.js";
import { LLMClient } from "./llmClient.js";
import { PROMPT_VERSION } from "../prompts/registry.js";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger.js";

export class EvaluationService {
  /** Runs AI evaluation for a candidate (direct enhanced path). Returns existing evaluation unless force is true or it is incomplete. */
  async evaluateCandidate(
    candidateId: string,
    opts: { force?: boolean } = {}
  ): Promise<Evaluation | null> {
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

    if (existing && !opts.force && !isEvaluationIncomplete(existing)) {
      return existing;
    }

    logger.info(
      "EvaluationService",
      `[Evaluation] Starting DIRECT enhanced evaluation for candidate ${candidateId}${existing ? " (re-evaluating)" : ""}`
    );

    const llmClient = new LLMClient();
    let evaluationData: Record<string, any> | undefined;
    const maxRetries = 4; // Allow more retries for rate limits (429/503)
    const baseDelayMs = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        evaluationData = await llmClient.evaluateCandidateDirectEnhanced(
          job.blueprint,
          candidate.profile,
          candidate.cvRawText
        );
        evaluationData = normalizeEvaluationOutput(evaluationData);
        logger.info("EvaluationService", "[Evaluation] Direct enhanced evaluation completed");
        break;
      } catch (error) {
        const isParseError =
          error instanceof Error &&
          (error.message.includes("parse JSON") || error.message.includes("truncated"));
        const isRateLimitError = is429Or503(error);

        if (attempt < maxRetries && (isParseError || isRateLimitError)) {
          if (isRateLimitError) {
            const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
            logger.warn(
              "EvaluationService",
              `[Evaluation] Rate limited (429/503) on attempt ${attempt}, retrying in ${delayMs}ms...`
            );
            await sleep(delayMs);
          } else {
            logger.warn("EvaluationService", `[Evaluation] Parse error on attempt ${attempt}, retrying...`);
          }
          continue;
        }
        logger.error("EvaluationService", "[Evaluation] Error during evaluation", error);
        if (is429Or503(error)) {
          throw new Error(
            "The AI provider is temporarily overloaded (rate limit). Please try again in a minute."
          );
        }
        throw new Error(
          `Failed to evaluate candidate: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (!evaluationData) {
      throw new Error("Failed to evaluate candidate: no evaluation data");
    }

    // Create/update evaluation record
    // Convert LLM response (lowercase) to database enum (uppercase)
    const decisionUpper = (evaluationData.decision as string).toUpperCase() as EvaluationDecision;
    
    // Extract enhanced evaluation fields
    const enhancedData: Record<string, any> = {};
    
    // Store all enhanced evaluation fields
    if (evaluationData.jd_requirements_analysis) {
      enhancedData.jd_requirements_analysis = evaluationData.jd_requirements_analysis;
    }
    if (evaluationData.experience_analysis) {
      enhancedData.experience_analysis = evaluationData.experience_analysis;
    }
    if (evaluationData.skills_comparison) {
      enhancedData.skills_comparison = evaluationData.skills_comparison;
    }
    if (evaluationData.professional_experience_comparison) {
      enhancedData.professional_experience_comparison = evaluationData.professional_experience_comparison;
    }
    if (evaluationData.resume_quality_issues) {
      enhancedData.resume_quality_issues = evaluationData.resume_quality_issues;
    }
    if (evaluationData.portfolio_links) {
      enhancedData.portfolio_links = evaluationData.portfolio_links;
    }
    if (evaluationData.detailed_comparison) {
      enhancedData.detailed_comparison = evaluationData.detailed_comparison;
    }
    if (evaluationData.matching_strengths) {
      enhancedData.matching_strengths = evaluationData.matching_strengths;
    }
    if (evaluationData.missing_gaps) {
      enhancedData.missing_gaps = evaluationData.missing_gaps;
    }
    if (evaluationData.brutal_gap_analysis) {
      enhancedData.brutal_gap_analysis = evaluationData.brutal_gap_analysis;
    }
    if ((evaluationData as any).jd_brutal_review) {
      (enhancedData as any).jd_brutal_review = (evaluationData as any).jd_brutal_review;
    }
    if ((evaluationData as any).company_fit_report) {
      (enhancedData as any).company_fit_report = (evaluationData as any).company_fit_report;
    }
    if ((evaluationData as any).adjacent_skill_inferences) {
      (enhancedData as any).adjacent_skill_inferences = (evaluationData as any).adjacent_skill_inferences;
    }
    if (evaluationData.overall_match_score !== undefined) {
      enhancedData.overall_match_score = evaluationData.overall_match_score;
    }
    const evaluationPayload: Omit<NewEvaluation, "id"> & Partial<Pick<NewEvaluation, "id">> = {
      ...(existing ? { id: existing.id } : { id: randomUUID() }),
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
      enhancedData: Object.keys(enhancedData).length > 0 ? enhancedData : undefined,
    };

    let evaluation: Evaluation;
    try {
      if (existing) {
        const [updated] = await db
          .update(evaluations)
          .set({
            decision: evaluationPayload.decision!,
            confidence: evaluationPayload.confidence!,
            criteriaMatches: evaluationPayload.criteriaMatches!,
            strengths: evaluationPayload.strengths!,
            concerns: evaluationPayload.concerns!,
            redFlagsFound: evaluationPayload.redFlagsFound!,
            summary: evaluationPayload.summary!,
            recommendedQuestions: evaluationPayload.recommendedQuestions,
            promptVersion: evaluationPayload.promptVersion,
            enhancedData: evaluationPayload.enhancedData,
          })
          .where(eq(evaluations.id, existing.id))
          .returning();
        evaluation = updated;
      } else {
        const [inserted] = await db.insert(evaluations).values(evaluationPayload as NewEvaluation).returning();
        evaluation = inserted;
      }
    } catch (dbError: any) {
      // Check if error is about missing enhanced_data column
      const errorMessage = dbError?.message || String(dbError || "");
      const errorCode = dbError?.code || "";
      const isColumnError =
        errorCode === "42703" ||
        errorMessage.includes("enhanced_data") ||
        (errorMessage.includes("column") && errorMessage.includes("does not exist")) ||
        (errorMessage.includes("column") && errorMessage.includes("enhanced"));

      if (isColumnError) {
        logger.warn(
          "EvaluationService",
          "enhanced_data column not found, saving without enhanced fields. Run: bun run db:add-enhanced-column"
        );

        if (existing) {
          const [updated] = await db
            .update(evaluations)
            .set({
              decision: evaluationPayload.decision!,
              confidence: evaluationPayload.confidence!,
              criteriaMatches: evaluationPayload.criteriaMatches!,
              strengths: evaluationPayload.strengths!,
              concerns: evaluationPayload.concerns!,
              redFlagsFound: evaluationPayload.redFlagsFound!,
              summary: evaluationPayload.summary!,
              recommendedQuestions: evaluationPayload.recommendedQuestions,
              promptVersion: evaluationPayload.promptVersion,
            })
            .where(eq(evaluations.id, existing.id))
            .returning();
          evaluation = updated;
        } else {
          const { enhancedData, ...withoutEnhanced } = evaluationPayload as any;
          const [inserted] = await db.insert(evaluations).values(withoutEnhanced).returning();
          evaluation = inserted;
        }
      } else {
        logger.error("EvaluationService", "Database error", dbError);
        throw dbError;
      }
    }

    // Update candidate status
    await db.update(candidates).set({ status: "EVALUATED" }).where(eq(candidates.id, candidateId));

    // Create audit log
    const log: NewAuditLog = {
      id: randomUUID(),
      candidateId,
      action: existing ? "re_evaluated" : "evaluated",
      actionMetadata: {
        decision: evaluationData.decision,
        confidence: evaluationData.confidence,
        force: !!opts.force,
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
    
    // Extract job requirements from blueprint
    let jobRequirements = "";
    let candidateExperience = "";
    if (emailType === "reject" && job.blueprint) {
      const blueprint = job.blueprint as any;
      const requiredSkills = blueprint.required_skills || [];
      const experienceRange = blueprint.experience_range || {};
      const responsibilities = blueprint.responsibilities || [];
      
      // Format job requirements
      const skillsText = requiredSkills
        .filter((s: any) => s.priority === "must_have")
        .map((s: any) => {
          const years = s.years_preferred ? `${s.years_preferred}+ years` : "";
          return `${s.skill}${years ? ` (${years})` : ""}`;
        })
        .join(", ");
      
      const expText = experienceRange.min_years 
        ? `${experienceRange.min_years}${experienceRange.max_years ? `-${experienceRange.max_years}` : "+"} years of experience`
        : "";
      
      const respText = responsibilities.slice(0, 3).join(", ");
      
      jobRequirements = [skillsText, expText, respText].filter(Boolean).join(". ");
      
      // Extract candidate experience from profile
      if (candidate.profile) {
        const profile = candidate.profile as any;
        const candidateSkills = (profile.skills || []).slice(0, 5).map((s: any) => s.skill).join(", ");
        const totalExp = profile.total_years_experience || 0;
        candidateExperience = `Total experience: ${totalExp} years. Skills: ${candidateSkills}`;
      }
    }
    
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
        emailType === "invite" ? hiringManager : null,
        emailType === "reject" ? jobRequirements : null,
        emailType === "reject" ? candidateExperience : null
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function is429Or503(error: unknown): boolean {
  if (error && typeof error === "object") {
    const status = (error as { status?: number }).status;
    if (status === 429 || status === 503) return true;
    const msg = String((error as Error).message ?? "");
    if (msg.includes("429") || msg.includes("503") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("rate limit")) return true;
  }
  return false;
}

function asArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function asObject(v: any): Record<string, any> {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

/**
 * Ensure the evaluation JSON always has a stable, UI-friendly shape.
 * - Fills missing keys with empty arrays/objects
 * - Accepts camelCase variants and maps to snake_case for top-level enhanced sections
 */
function normalizeEvaluationOutput(raw: Record<string, any>): Record<string, any> {
  const e = asObject(raw);

  // Alias common camelCase -> snake_case if LLM returns mixed styles
  const matching_strengths = e.matching_strengths ?? e.matchingStrengths;
  const missing_gaps = e.missing_gaps ?? e.missingGaps;
  const brutal_gap_analysis = e.brutal_gap_analysis ?? e.brutalGapAnalysis;
  const jd_requirements_analysis = e.jd_requirements_analysis ?? e.jdRequirementsAnalysis;
  const experience_analysis = e.experience_analysis ?? e.experienceAnalysis;
  const skills_comparison = e.skills_comparison ?? e.skillsComparison;
  const professional_experience_comparison =
    e.professional_experience_comparison ?? e.professionalExperienceComparison;
  const resume_quality_issues = e.resume_quality_issues ?? e.resumeQualityIssues;
  const portfolio_links = e.portfolio_links ?? e.portfolioLinks;
  const detailed_comparison = e.detailed_comparison ?? e.detailedComparison;
  const jd_brutal_review = (e as any).jd_brutal_review ?? (e as any).jdBrutalReview;
  const company_fit_report = (e as any).company_fit_report ?? (e as any).companyFitReport;
  const adjacent_skill_inferences =
    (e as any).adjacent_skill_inferences ?? (e as any).adjacentSkillInferences;

  let criteriaMatches = asArray(e.criteria_matches);

  // If still too few criteria, synthesize a stable set from other sections
  const normalizedSkillsComparison = asArray(skills_comparison);
  const normalizedProfExpComparison = asArray(professional_experience_comparison);
  const normalizedResumeIssues = asArray(resume_quality_issues);
  const normalizedExperienceAnalysis = asObject(experience_analysis);

  if (criteriaMatches.length < 4) {
    const existingNames = new Set(
      criteriaMatches
        .map((c: any) => (typeof c?.criterion === "string" ? c.criterion : ""))
        .filter(Boolean)
    );

    const ratio = (num: number, den: number) => (den > 0 ? num / den : 0);

    const skillsTotal = normalizedSkillsComparison.length;
    const skillsMatched = normalizedSkillsComparison.filter((s: any) => s?.matches === true).length;
    const skillsScore = ratio(skillsMatched, skillsTotal);

    const respTotal = normalizedProfExpComparison.length;
    const respMatched = normalizedProfExpComparison.filter((r: any) => r?.matches === true).length;
    const respScore = ratio(respMatched, respTotal);

    const expMatches = !!normalizedExperienceAnalysis.matches;
    const expScore =
      expMatches ? 1 : typeof normalizedExperienceAnalysis.candidate_years === "number" &&
        normalizedExperienceAnalysis.candidate_years > 0
      ? 0.5
      : 0;

    const qualityPenalty = Math.min(1, normalizedResumeIssues.length / 10);
    const qualityScore = 1 - qualityPenalty;

    const synthesized: any[] = [];
    const addCriterion = (criterion: string, weight: number, score: number, reasoning: string) => {
      if (existingNames.has(criterion)) return;
      synthesized.push({
        criterion,
        weight,
        score: Math.max(0, Math.min(1, score)),
        matched: score >= 0.7,
        evidence: [],
        reasoning,
      });
      existingNames.add(criterion);
    };

    addCriterion(
      "SkillsMatch",
      0.35,
      skillsScore,
      `Auto-derived from skills_comparison: matched ${skillsMatched}/${skillsTotal} required skills.`
    );
    addCriterion(
      "ResponsibilitiesMatch",
      0.35,
      respScore,
      `Auto-derived from professional_experience_comparison: matched ${respMatched}/${respTotal} responsibilities.`
    );
    addCriterion(
      "ExperienceYears",
      0.2,
      expScore,
      `Auto-derived from experience_analysis.matches=${String(expMatches)}.`
    );
    addCriterion(
      "ResumeQuality",
      0.1,
      qualityScore,
      `Auto-derived from resume_quality_issues count=${normalizedResumeIssues.length}.`
    );

    // If we already had some criteria, keep them, then append synthesized ones until we hit 4+
    criteriaMatches = [...criteriaMatches, ...synthesized].slice(0, Math.max(4, criteriaMatches.length));
  }

  // Compute overall_match_score if missing/zero and we have criteriaMatches with weights
  let overallMatchScore =
    typeof e.overall_match_score === "number" ? e.overall_match_score : 0;
  if (overallMatchScore === 0 && criteriaMatches.length > 0) {
    const denom = criteriaMatches.reduce(
      (sum: number, c: any) => sum + (typeof c.weight === "number" ? c.weight : 0),
      0
    );
    const num = criteriaMatches.reduce(
      (sum: number, c: any) =>
        sum +
        (typeof c.weight === "number" ? c.weight : 0) *
          (typeof c.score === "number" ? c.score : 0),
      0
    );
    overallMatchScore = denom > 0 ? num / denom : 0;
  }

  return {
    decision: typeof e.decision === "string" ? e.decision : "maybe",
    confidence: typeof e.confidence === "number" ? e.confidence : 0.5,
    overall_match_score: overallMatchScore,

    jd_requirements_analysis: {
      must_have: asArray(asObject(jd_requirements_analysis).must_have),
      nice_to_have: asArray(asObject(jd_requirements_analysis).nice_to_have),
    },

    jd_brutal_review: asObject(jd_brutal_review),
    company_fit_report: asObject(company_fit_report),
    adjacent_skill_inferences: asArray(adjacent_skill_inferences),

    matching_strengths: {
      skills_that_match: asArray(asObject(matching_strengths).skills_that_match),
      experience_that_matches: asArray(asObject(matching_strengths).experience_that_matches),
    },

    missing_gaps: {
      technology_gaps: asArray(asObject(missing_gaps).technology_gaps),
      experience_gaps: asArray(asObject(missing_gaps).experience_gaps),
      skill_gaps: asArray(asObject(missing_gaps).skill_gaps),
      other_gaps: asArray(asObject(missing_gaps).other_gaps),
    },

    brutal_gap_analysis: {
      critical_gaps: asArray(asObject(brutal_gap_analysis).critical_gaps),
      major_gaps: asArray(asObject(brutal_gap_analysis).major_gaps),
      moderate_gaps: asArray(asObject(brutal_gap_analysis).moderate_gaps),
      indirect_experience_analysis: asArray(
        asObject(brutal_gap_analysis).indirect_experience_analysis
      ),
    },

    experience_analysis: {
      jd_requirement: asObject(experience_analysis).jd_requirement ?? "",
      candidate_years:
        typeof asObject(experience_analysis).candidate_years === "number"
          ? asObject(experience_analysis).candidate_years
          : 0,
      calculated_from_cv: asObject(experience_analysis).calculated_from_cv ?? "",
      matches: !!asObject(experience_analysis).matches,
      gap_analysis: asObject(experience_analysis).gap_analysis ?? "",
      employment_gaps: asArray(asObject(experience_analysis).employment_gaps),
      chunk_citations: asArray(asObject(experience_analysis).chunkCitations ?? asObject(experience_analysis).chunk_citations),
      detailed_education_analysis: asArray(asObject(experience_analysis).detailed_education_analysis),
      detailed_work_experience_analysis: asArray(asObject(experience_analysis).detailed_work_experience_analysis),
    },

    skills_comparison: asArray(skills_comparison),
    professional_experience_comparison: asArray(professional_experience_comparison),
    resume_quality_issues: asArray(resume_quality_issues),
    portfolio_links: {
      linkedin: asObject(portfolio_links).linkedin ?? null,
      github: asObject(portfolio_links).github ?? null,
      portfolio: asObject(portfolio_links).portfolio ?? null,
      other_links: asArray(asObject(portfolio_links).other_links),
      missing_expected: asArray(asObject(portfolio_links).missing_expected),
    },
    detailed_comparison: asArray(detailed_comparison),

    criteria_matches: criteriaMatches,
    strengths: asArray(e.strengths),
    concerns: asArray(e.concerns),
    red_flags_found: asArray(e.red_flags_found),
    summary: typeof e.summary === "string" ? e.summary : "",
    recommended_interview_questions: asArray(e.recommended_interview_questions),
  };
}

function isEvaluationIncomplete(evaluation: Evaluation): boolean {
  const criteriaCount = Array.isArray(evaluation.criteriaMatches)
    ? evaluation.criteriaMatches.length
    : 0;
  const enhanced = (evaluation as any).enhancedData as Record<string, any> | undefined;
  const missingGapsCount = Array.isArray(enhanced?.missing_gaps?.technology_gaps)
    ? enhanced!.missing_gaps.technology_gaps.length
    : 0;
  const strengthsCount = Array.isArray(enhanced?.matching_strengths?.skills_that_match)
    ? enhanced!.matching_strengths.skills_that_match.length
    : 0;

  // Treat an evaluation as incomplete if it lacks the core structured sections
  return criteriaCount === 0 || (missingGapsCount === 0 && strengthsCount === 0);
}
