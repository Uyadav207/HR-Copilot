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
  // Enhanced evaluation fields
  jd_requirements_analysis?: {
    must_have: Array<Record<string, any>>;
    nice_to_have: Array<Record<string, any>>;
  };
  experience_analysis?: Record<string, any>;
  skills_comparison?: Array<Record<string, any>>;
  professional_experience_comparison?: Array<Record<string, any>>;
  resume_quality_issues?: Array<Record<string, any>>;
  portfolio_links?: Record<string, any>;
  detailed_comparison?: Array<Record<string, any>>;
  matching_strengths?: {
    skills_that_match: Array<Record<string, any>>;
    experience_that_matches: Array<Record<string, any>>;
  };
  missing_gaps?: {
    technology_gaps: string[];
    experience_gaps: string[];
    skill_gaps: string[];
    other_gaps: string[];
  };
  criteria_analysis?: Array<Record<string, any>>;
  brutal_gap_analysis?: {
    critical_gaps: Array<Record<string, any>>;
    major_gaps: Array<Record<string, any>>;
    moderate_gaps: Array<Record<string, any>>;
    indirect_experience_analysis: Array<Record<string, any>>;
  };
}

export interface EmailDraft {
  email_type: "invite" | "reject" | "hold";
  subject: string;
  body: string;
  personalization_notes?: string[];
}
