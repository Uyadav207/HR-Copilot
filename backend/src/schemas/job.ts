import { z } from "zod";

export const JobCreateSchema = z.object({
  title: z.string().min(1).max(255),
  raw_description: z.string().min(1),
});

export const JobUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  raw_description: z.string().min(1).optional(),
});

export const JobBlueprintSchema = z.object({
  role_title: z.string(),
  department: z.string().nullable().optional(),
  seniority_level: z.string().nullable().optional(),
  required_skills: z.array(z.record(z.any())),
  experience_range: z.record(z.union([z.number(), z.null()])),
  responsibilities: z.array(z.string()),
  qualifications: z.array(z.string()),
  red_flags: z.array(z.string()),
  evaluation_criteria: z.array(z.record(z.any())),
});

export type JobCreate = z.infer<typeof JobCreateSchema>;
export type JobUpdate = z.infer<typeof JobUpdateSchema>;
export type JobBlueprint = z.infer<typeof JobBlueprintSchema>;
