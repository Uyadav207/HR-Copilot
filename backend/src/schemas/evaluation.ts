import { z } from "zod";

export const EvaluationDecisionSchema = z.enum(["yes", "maybe", "no"]);
export const FinalDecisionSchema = z.enum(["invited", "rejected", "on_hold"]);

export const EvaluationDecisionUpdateSchema = z.object({
  decision: FinalDecisionSchema,
});

export const EmailDraftRequestSchema = z.object({
  email_type: z.enum(["invite", "reject", "hold"]),
});

export type EvaluationDecisionUpdate = z.infer<typeof EvaluationDecisionUpdateSchema>;
export type EmailDraftRequest = z.infer<typeof EmailDraftRequestSchema>;
