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
    overall_match_percentage?: number
    sub_criteria_analysis?: Array<{
      sub_criterion: string
      jd_requirement: string
      candidate_has: string
      match_percentage: number
      missing: string[]
      evidence?: {
        cv_snippet: string
        chunk_id: string
        chunk_index: number
      }
    }>
    evidence: Array<{
      claim: string
      cv_snippet: string
      source_section: string
      chunk_id?: string
      chunk_index?: number
      chunk_text?: string
    }>
    reasoning: string
  }>
  strengths: Array<{
    point: string
    evidence: string
    chunk_citations?: string[]
  }>
  concerns: Array<{
    point: string
    evidence: string
    severity: 'minor' | 'moderate' | 'major'
    chunk_citations?: string[]
  }>
  red_flags_found: Array<{
    flag: string
    evidence: string
    severity: 'minor' | 'moderate' | 'major'
    chunk_citations?: string[]
  }>
  summary: string
  recommended_questions: string[] | null
  prompt_version: string | null
  final_decision: 'invited' | 'rejected' | 'on_hold' | null
  decided_at: string | null
  created_at: string
  // Enhanced evaluation fields
  jd_requirements_analysis?: {
    must_have: Array<{
      requirement: string
      priority: string
      jd_source: string
    }>
    nice_to_have: Array<{
      requirement: string
      priority: string
      jd_source: string
    }>
  }
  experience_analysis?: {
    jd_requirement: string
    candidate_years: number
    calculated_from_cv: string
    matches: boolean
    gap_analysis: string
    employment_gaps: Array<any>
    chunk_citations: string[]
    detailed_education_analysis?: Array<{
      requirement_type: string
      jd_requirement: string
      jd_requirement_details: string
      candidate_has: string
      degree_level: string
      degree_field: string
      match_status: 'exact_match' | 'similar_match' | 'no_match'
      match_reason: string
      note: string | null
      evidence: {
        cv_snippet: string
        chunkId: string
        chunkIndex: number
      } | null
    }>
    detailed_work_experience_analysis?: Array<{
      requirement_type: string
      jd_requirement: string
      jd_requirement_details: string
      candidate_has: string
      experience_type: string
      candidate_years: number
      required_years: number
      match_status: 'exact_match' | 'similar_match' | 'no_match'
      match_reason: string
      note: string | null
      evidence: {
        cv_snippet: string
        chunkId: string
        chunkIndex: number
      } | null
    }>
  }
  skills_comparison?: Array<{
    skill: string
    jd_requirement: string
    candidate_level: string | null
    candidate_years: number
    matches: boolean
    evidence: {
      cv_snippet: string
      chunk_id: string
      chunk_index: number
      chunk_text: string
    } | null
    verification: string
  }>
  professional_experience_comparison?: Array<{
    jd_responsibility: string
    candidate_experience: string
    matches: boolean
    gap: string
    severity: 'minor' | 'moderate' | 'major'
    evidence: {
      cv_snippet: string
      chunk_id: string
      chunk_index: number
    }
  }>
  resume_quality_issues?: Array<{
    type: 'spelling' | 'grammar' | 'confusion' | 'inconsistency' | 'gap'
    issue: string
    location: string
    severity: 'minor' | 'moderate' | 'major'
    example: string
    chunk_id: string
  }>
  portfolio_links?: {
    linkedin: string | null
    github: string | null
    portfolio: string | null
    other_links: string[]
    missing_expected: string[]
  }
  detailed_comparison?: Array<{
    category: string
    jd_requirement: string
    candidate_evidence: string
    match_status: 'perfect_match' | 'partial_match' | 'no_match' | 'exceeds'
    gap_description: string
    severity: 'critical' | 'major' | 'moderate' | 'minor' | 'none'
    chunk_citations: string[]
  }>
  matching_strengths?: {
    skills_that_match: Array<{
      skill: string
      jd_requirement: string
      candidate_evidence: string
      match_percentage: number
      evidence?: {
        cv_snippet: string
        source_section?: string
        chunk_id?: string | null
        chunk_index?: number | null
        chunk_text?: string | null
      } | null
    }>
    experience_that_matches: Array<{
      experience: string
      jd_requirement: string
      candidate_evidence: string
      match_percentage: number
      gap?: string | null
      evidence?: {
        cv_snippet: string
        source_section?: string
        chunk_id?: string | null
        chunk_index?: number | null
        chunk_text?: string | null
      } | null
    }>
  }
  missing_gaps?: {
    technology_gaps: string[]
    experience_gaps: string[]
    skill_gaps: string[]
    other_gaps: string[]
  }
  brutal_gap_analysis?: {
    critical_gaps: Array<any>
    major_gaps: Array<any>
    moderate_gaps: Array<any>
    indirect_experience_analysis: Array<any>
  }
  jd_brutal_review?: {
    jd_summary: string
    must_have_quality: 'clear' | 'somewhat_unclear' | 'unclear'
    red_flags_or_concerns: string[]
    missing_information: string[]
    contradictions_or_ambiguities: string[]
    evaluation_implications: string[]
  }
  company_fit_report?: {
    work_environment_fit: {
      jd_expectations: string
      candidate_signals: string
      fit: 'strong' | 'partial' | 'unknown' | 'weak'
      risks: string[]
      evidence: {
        cv_snippet: string
        source_section: string
        chunk_id?: string | null
        chunk_index?: number | null
        chunk_text?: string | null
      }
    }
    collaboration_communication_fit: {
      jd_expectations: string
      candidate_signals: string
      fit: 'strong' | 'partial' | 'unknown' | 'weak'
      risks: string[]
      evidence: {
        cv_snippet: string
        source_section: string
        chunk_id?: string | null
        chunk_index?: number | null
        chunk_text?: string | null
      }
    }
    ownership_leadership_fit: {
      jd_expectations: string
      candidate_signals: string
      fit: 'strong' | 'partial' | 'unknown' | 'weak'
      risks: string[]
      evidence: {
        cv_snippet: string
        source_section: string
        chunk_id?: string | null
        chunk_index?: number | null
        chunk_text?: string | null
      }
    }
    overall_hr_verdict: {
      one_line: string
      top_3_reasons_to_hire: string[]
      top_3_reasons_not_to_hire: string[]
      biggest_unknowns: string[]
      recommended_next_step: 'reject' | 'phone_screen' | 'technical_screen' | 'onsite' | 'hiring_manager_interview'
      risk_level: 'low' | 'medium' | 'high'
    }
  }
  adjacent_skill_inferences?: Array<{
    inference: string
    why_it_might_matter: string
    basis: string
    confidence: number
  }>
  overall_match_score: number
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

