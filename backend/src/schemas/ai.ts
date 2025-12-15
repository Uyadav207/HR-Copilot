// Type definitions for AI-related schemas
// These match the structure expected from LLM responses

export interface JobBlueprint {
  role_title: string;
  department?: string | null;
  seniority_level?: string | null;
  required_skills: Array<Record<string, any>>;
  experience_range: Record<string, number | null>;
  responsibilities: string[];
  qualifications: string[];
  red_flags: string[];
  evaluation_criteria: Array<Record<string, any>>;
}

export interface CandidateProfile {
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  total_years_experience: number;
  skills: Array<Record<string, any>>;
  experience: Array<Record<string, any>>;
  education: Array<Record<string, any>>;
  certifications: string[];
  summary: string;
}

export interface CandidateEvaluation {
  decision: "yes" | "maybe" | "no";
  confidence: number;
  criteria_matches: Array<Record<string, any>>;
  overall_match_score: number;
  strengths: Array<Record<string, any>>;
  concerns: Array<Record<string, any>>;
  red_flags_found: Array<Record<string, any>>;
  summary: string;
  recommended_interview_questions: string[];
}

export interface EmailDraft {
  email_type: "invite" | "reject" | "hold";
  subject: string;
  body: string;
  personalization_notes?: string[];
}
