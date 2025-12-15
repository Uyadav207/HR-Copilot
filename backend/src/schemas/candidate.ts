import { z } from "zod";

export const CandidateStatusSchema = z.enum(["pending", "evaluated", "invited", "rejected", "on_hold"]);

export type CandidateStatus = z.infer<typeof CandidateStatusSchema>;
