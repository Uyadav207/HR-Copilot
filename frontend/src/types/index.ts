export interface Job {
  id: string
  title: string
  raw_description: string
  blueprint: JobBlueprint | null
  prompt_version: string | null
  created_at: string
  updated_at: string
}

export interface JobBlueprint {
  role_title: string
  department?: string
  seniority_level?: string
  required_skills: Array<{
    skill: string
    priority: 'must_have' | 'nice_to_have'
    years_preferred: number | null
  }>
  experience_range: {
    min_years: number | null
    max_years: number | null
  }
  responsibilities: string[]
  qualifications: string[]
  red_flags: string[]
  evaluation_criteria: Array<{
    criterion: string
    weight: number
  }>
}

export interface Candidate {
  id: string
  job_id: string
  name: string | null
  email: string | null
  phone: string | null
  cv_filename: string
  cv_raw_text: string
  profile: CandidateProfile | null
  prompt_version: string | null
  status: 'pending' | 'evaluated' | 'invited' | 'rejected' | 'on_hold'
  created_at: string
  updated_at: string
}

export interface CandidateProfile {
  name: string
  email?: string
  phone?: string
  location?: string
  linkedin_url?: string
  total_years_experience: number
  skills: Array<{
    skill: string
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    evidence: string
  }>
  experience: Array<{
    company: string
    role: string
    start_date: string
    end_date: string | null
    duration_months: number
    highlights: string[]
    evidence_snippets: string[]
  }>
  education: Array<{
    institution: string
    degree: string
    graduation_year?: string
  }>
  certifications: string[]
  summary: string
}

export interface Evaluation {
  id: string
  candidate_id: string
  decision: 'yes' | 'maybe' | 'no'
  confidence: number
  criteria_matches: Array<{
    criterion: string
    weight: number
    score: number
    matched: boolean
    evidence: Array<{
      claim: string
      cv_snippet: string
      source_section: string
    }>
    reasoning: string
  }>
  strengths: Array<{
    point: string
    evidence: string
  }>
  concerns: Array<{
    point: string
    evidence: string
    severity: 'minor' | 'moderate' | 'major'
  }>
  red_flags_found: Array<{
    flag: string
    evidence: string
    severity: 'minor' | 'moderate' | 'major'
  }>
  summary: string
  recommended_questions: string[] | null
  prompt_version: string | null
  final_decision: 'invited' | 'rejected' | 'on_hold' | null
  decided_at: string | null
  created_at: string
}

export interface EmailDraft {
  id: string
  evaluation_id: string
  email_type: 'invite' | 'reject' | 'hold'
  subject: string
  body: string
  created_at: string
}

export interface AuditLog {
  id: string
  candidate_id: string
  action: string
  metadata: Record<string, any> | null
  created_at: string
}

