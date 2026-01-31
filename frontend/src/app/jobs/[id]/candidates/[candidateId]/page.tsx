'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/api'
import { Candidate, Evaluation, EmailDraft, AuditLog } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Trash2, MoreVertical, ExternalLink, AlertCircle, CheckCircle2, XCircle, Link as LinkIcon, MessageCircle, ChevronDown, Loader2, Brain, FileSearch, ClipboardCheck, Sparkles } from 'lucide-react'
import { FloatingCandidateChat } from '@/components/floating-candidate-chat'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

async function fetchCandidate(id: string): Promise<Candidate> {
  return apiRequest<Candidate>(`/api/candidates/${id}`)
}

async function fetchEvaluation(candidateId: string): Promise<Evaluation | null> {
  try {
    return await apiRequest<Evaluation>(`/api/candidates/${candidateId}/evaluation`)
  } catch {
    return null
  }
}

async function evaluateCandidate(candidateId: string): Promise<Evaluation> {
  return apiRequest<Evaluation>(`/api/candidates/${candidateId}/evaluate`, {
    method: 'POST',
  })
}

async function updateDecision(evaluationId: string, decision: string): Promise<Evaluation> {
  return apiRequest<Evaluation>(`/api/evaluations/${evaluationId}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({ decision }),
  })
}

async function generateEmailDraft(evaluationId: string, emailType: string): Promise<EmailDraft> {
  return apiRequest<EmailDraft>(`/api/evaluations/${evaluationId}/email-draft`, {
    method: 'POST',
    body: JSON.stringify({ email_type: emailType }),
  })
}

async function sendEmail(evaluationId: string, emailType: string): Promise<{ message: string; to: string; subject: string }> {
  return apiRequest<{ message: string; to: string; subject: string }>(`/api/evaluations/${evaluationId}/send-email?email_type=${emailType}`, {
    method: 'POST',
  })
}

async function fetchTimeline(candidateId: string): Promise<AuditLog[]> {
  return apiRequest<AuditLog[]>(`/api/candidates/${candidateId}/timeline`)
}

async function deleteCandidate(candidateId: string): Promise<void> {
  return apiRequest<void>(`/api/candidates/${candidateId}`, {
    method: 'DELETE',
  })
}

function CollapsiblePanel({
  title,
  description,
  defaultOpen = false,
  className,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  defaultOpen?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group",
        "relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
    >
      <summary className="list-none cursor-pointer select-none">
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xl font-semibold leading-none tracking-tight">{title}</div>
              {description ? (
                <div className="mt-1 text-sm text-muted-foreground">{description}</div>
              ) : null}
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
          </div>
        </div>
      </summary>
      <div className="p-6 pt-0">{children}</div>
    </details>
  )
}

const EVALUATION_MESSAGES = [
  { icon: FileSearch, text: "Parsing resume content...", subtext: "Extracting skills and experience" },
  { icon: Brain, text: "Analyzing candidate profile...", subtext: "Understanding career trajectory" },
  { icon: ClipboardCheck, text: "Comparing with job requirements...", subtext: "Matching skills to JD criteria" },
  { icon: Sparkles, text: "Evaluating technical skills...", subtext: "Assessing proficiency levels" },
  { icon: Brain, text: "Analyzing experience gaps...", subtext: "Identifying strengths and areas for growth" },
  { icon: ClipboardCheck, text: "Generating detailed assessment...", subtext: "Creating comprehensive evaluation" },
  { icon: Sparkles, text: "Calculating match scores...", subtext: "Quantifying candidate fit" },
  { icon: FileSearch, text: "Preparing interview questions...", subtext: "Tailoring questions to candidate profile" },
  { icon: Brain, text: "Finalizing evaluation report...", subtext: "Almost there!" },
]

function EvaluationLoadingState() {
  const [messageIndex, setMessageIndex] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    // Rotate messages every 4 seconds
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % EVALUATION_MESSAGES.length)
    }, 4000)

    // Update elapsed time every second
    const timeInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => {
      clearInterval(messageInterval)
      clearInterval(timeInterval)
    }
  }, [])

  const currentMessage = EVALUATION_MESSAGES[messageIndex]
  const IconComponent = currentMessage.icon

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <div className="space-y-6">
      {/* Main loading card */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse" />
        
        <div className="relative flex flex-col items-center text-center space-y-6">
          {/* Animated icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20">
              <IconComponent className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>

          {/* Loading spinner and message */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <h3 className="text-xl font-semibold">{currentMessage.text}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{currentMessage.subtext}</p>
          </div>

          {/* Progress indicator */}
          <div className="w-full max-w-md space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${Math.min(95, (messageIndex / EVALUATION_MESSAGES.length) * 100 + 10)}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>AI Evaluation in Progress</span>
              <span>{formatTime(elapsedSeconds)}</span>
            </div>
          </div>

          {/* Fun facts / tips while waiting */}
          <div className="mt-4 p-4 rounded-lg bg-muted/50 max-w-lg">
            <p className="text-sm text-muted-foreground">
              {elapsedSeconds < 15 && "Our AI is thoroughly analyzing every detail of the candidate's profile..."}
              {elapsedSeconds >= 15 && elapsedSeconds < 30 && "Deep analysis takes time - we're ensuring accuracy over speed..."}
              {elapsedSeconds >= 30 && elapsedSeconds < 60 && "Comparing against job requirements with precision..."}
              {elapsedSeconds >= 60 && elapsedSeconds < 90 && "Almost done! Generating comprehensive insights..."}
              {elapsedSeconds >= 90 && "Finalizing the detailed evaluation report..."}
            </p>
          </div>
        </div>
      </div>

      {/* What's happening behind the scenes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Skills Matched", done: messageIndex >= 3 },
          { label: "Experience Verified", done: messageIndex >= 5 },
          { label: "Gaps Analyzed", done: messageIndex >= 6 },
          { label: "Report Ready", done: messageIndex >= 8 },
        ].map((step, idx) => (
          <div 
            key={idx}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border transition-all duration-500",
              step.done 
                ? "bg-green-500/10 border-green-500/30 text-green-700" 
                : "bg-muted/50 border-border text-muted-foreground"
            )}
          >
            {step.done ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CandidateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const candidateId = params.candidateId as string
  const jobId = params.id as string
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailType, setEmailType] = useState<'invite' | 'reject' | 'hold' | null>(null)
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => fetchCandidate(candidateId),
  })

  const { data: evaluation } = useQuery({
    queryKey: ['evaluation', candidateId],
    queryFn: () => fetchEvaluation(candidateId),
    enabled: !!candidateId,
  })

  const { data: timeline } = useQuery({
    queryKey: ['timeline', candidateId],
    queryFn: () => fetchTimeline(candidateId),
    enabled: !!candidateId,
  })

  const evaluateMutation = useMutation({
    mutationFn: () => evaluateCandidate(candidateId),
    onSuccess: (data) => {
      // Immediately update the cache with the new evaluation data
      // This ensures the UI updates instantly without waiting for a refetch
      queryClient.setQueryData(['evaluation', candidateId], data)
      // Invalidate queries to ensure background sync
      queryClient.invalidateQueries({ queryKey: ['evaluation', candidateId] })
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })
      queryClient.invalidateQueries({ queryKey: ['timeline', candidateId] })
    },
    onError: (error) => {
      toast({
        title: 'Evaluation failed',
        description: error instanceof Error ? error.message : 'Failed to evaluate candidate',
        variant: 'destructive',
      })
    },
  })

  const decisionMutation = useMutation({
    mutationFn: ({ evaluationId, decision }: { evaluationId: string; decision: string }) =>
      updateDecision(evaluationId, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation', candidateId] })
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })
    },
  })

  const emailDraftMutation = useMutation({
    mutationFn: ({ evaluationId, emailType }: { evaluationId: string; emailType: string }) =>
      generateEmailDraft(evaluationId, emailType),
    onSuccess: (data) => {
      setEmailDraft(data)
      setEmailDialogOpen(true)
    },
  })

  const sendEmailMutation = useMutation({
    mutationFn: ({ evaluationId, emailType }: { evaluationId: string; emailType: string }) =>
      sendEmail(evaluationId, emailType),
    onSuccess: () => {
      alert('Email sent successfully!')
      setEmailDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })
      queryClient.invalidateQueries({ queryKey: ['timeline', candidateId] })
    },
    onError: (error) => {
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`)
    },
  })

  const handleGenerateEmail = (type: 'invite' | 'reject' | 'hold') => {
    if (!evaluation) return
    setEmailType(type)
    emailDraftMutation.mutate({ evaluationId: evaluation.id, emailType: type })
  }

  // Map final_decision to email_type
  const mapDecisionToEmailType = (decision: string): 'invite' | 'reject' | 'hold' => {
    if (decision === 'invited') return 'invite'
    if (decision === 'rejected') return 'reject'
    if (decision === 'on_hold') return 'hold'
    return 'invite' // default
  }

  const handleCopyEmail = () => {
    if (!emailDraft) return
    const emailText = `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`
    navigator.clipboard.writeText(emailText)
    alert('Email copied to clipboard!')
  }

  const handleSendEmail = () => {
    if (!evaluation || !emailType) return
    if (!confirm('Are you sure you want to send this email to the candidate?')) return
    sendEmailMutation.mutate({ evaluationId: evaluation.id, emailType })
  }

  const handleDecision = (decision: 'invited' | 'rejected' | 'on_hold') => {
    if (!evaluation) return
    decisionMutation.mutate({ evaluationId: evaluation.id, decision })
  }

  const deleteCandidateMutation = useMutation({
    mutationFn: () => deleteCandidate(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', jobId] })
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })
      setDeleteDialogOpen(false)
      toast({
        title: 'Candidate deleted',
        description: 'The candidate has been successfully deleted.',
        variant: 'success',
      })
      router.push(`/jobs/${jobId}`)
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete candidate',
        variant: 'destructive',
      })
    },
  })

  const handleDeleteCandidate = () => {
    deleteCandidateMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">Loading candidate…</div>
    )
  }

  if (!candidate) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">Candidate not found</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <span aria-hidden>←</span> Back
        </Button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold mb-2">
                {candidate.name || candidate.cv_filename}
              </h1>
              <Badge variant="outline">{candidate.status}</Badge>
            </div>
            {candidate.email && (
              <p className="text-muted-foreground text-sm">{candidate.email}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="glass" size="sm" className="h-9 w-9 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Candidate</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>AI-parsed CV information</CardDescription>
            </CardHeader>
            <CardContent>
            {candidate.profile ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    {candidate.profile.total_years_experience} years
                  </p>
                </div>

                {candidate.profile.skills && candidate.profile.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {candidate.profile.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill.skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {candidate.profile.summary && (
                  <div>
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <p className="text-sm">{candidate.profile.summary}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">Profile parsing in progress...</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evaluation</CardTitle>
            <CardDescription>AI-powered candidate assessment</CardDescription>
          </CardHeader>
          <CardContent>
            {evaluateMutation.isPending ? (
              <EvaluationLoadingState />
            ) : !evaluation ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  No evaluation yet. Click below to evaluate this candidate.
                </p>
                <Button
                  onClick={() => evaluateMutation.mutate()}
                  disabled={!candidate.profile}
                >
                  Evaluate Candidate
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      evaluation.decision === 'yes'
                        ? 'default'
                        : evaluation.decision === 'maybe'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {evaluation.decision.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {(evaluation.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <p className="text-sm">{evaluation.summary}</p>
                </div>

                {evaluation.final_decision ? (
                  <div className="space-y-2">
                    <Badge variant="outline">
                      Final: {evaluation.final_decision}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateEmail(mapDecisionToEmailType(evaluation.final_decision!))}
                        disabled={emailDraftMutation.isPending}
                      >
                        {emailDraftMutation.isPending ? 'Generating...' : 'Generate Email'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleDecision('invited')}
                        disabled={decisionMutation.isPending}
                      >
                        Invite
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecision('on_hold')}
                        disabled={decisionMutation.isPending}
                      >
                        Hold
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDecision('rejected')}
                        disabled={decisionMutation.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateEmail('invite')}
                        disabled={emailDraftMutation.isPending}
                      >
                        Preview Invite Email
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

      </div>

      {/* Floating Chat */}
      {candidate && (
        <FloatingCandidateChat
          candidateId={candidateId}
          candidateName={candidate.name ?? undefined}
        />
      )}

      {evaluation && (
        <>
          {/* Quick Overview - 10 Second Evaluation */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Overview</CardTitle>
              <CardDescription>10-second evaluation summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold mb-2">
                    {(evaluation.overall_match_score * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Match Score</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold mb-2">
                    {evaluation.decision.toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground">Decision</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold mb-2">
                    {(evaluation.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Confidence</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Evaluation Sections */}
          {evaluation.jd_requirements_analysis && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>JD Requirements Analysis</CardTitle>
                <CardDescription>Must-have vs Nice-to-have requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {evaluation.jd_requirements_analysis.must_have && evaluation.jd_requirements_analysis.must_have.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Must-Have Requirements (Critical)
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {evaluation.jd_requirements_analysis.must_have.map((req: any, idx: number) => (
                        <li key={idx} className="text-sm">
                          <strong>{req.requirement}</strong>
                          <span className="text-muted-foreground ml-2 text-xs">({req.jd_source})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {evaluation.jd_requirements_analysis.nice_to_have && evaluation.jd_requirements_analysis.nice_to_have.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-blue-700">Nice-to-Have Requirements</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {evaluation.jd_requirements_analysis.nice_to_have.map((req: any, idx: number) => (
                        <li key={idx} className="text-sm">
                          {req.requirement}
                          <span className="text-muted-foreground ml-2 text-xs">({req.jd_source})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Experience Analysis */}
          {evaluation.experience_analysis && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Experience Analysis</CardTitle>
                <CardDescription>Detailed years calculation and gap analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-semibold">JD Requirement:</span>
                    <span>{evaluation.experience_analysis.jd_requirement}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-semibold">Candidate Years:</span>
                    <span className="flex items-center gap-2">
                      {evaluation.experience_analysis.candidate_years} years
                      {evaluation.experience_analysis.matches ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </span>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-semibold mb-1">Calculation:</div>
                    <div className="text-xs text-muted-foreground">{evaluation.experience_analysis.calculated_from_cv}</div>
                  </div>
                  {evaluation.experience_analysis.gap_analysis && (
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-semibold mb-1">Gap Analysis:</div>
                      <div className="text-sm">{evaluation.experience_analysis.gap_analysis}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills Comparison */}
          {evaluation.skills_comparison && evaluation.skills_comparison.length > 0 && (
            <CollapsiblePanel
              className="mt-6"
              title="Skills Comparison"
              description="JD requirements vs candidate skills"
              defaultOpen={false}
            >
              <div className="space-y-4">
                {evaluation.skills_comparison.map((skill: any, idx: number) => (
                  <div key={idx} className="border border-white/10 rounded-xl bg-white/[0.03] p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{skill.skill}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          JD: {skill.jd_requirement}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Candidate: {skill.candidate_level || 'Not mentioned'} ({skill.candidate_years} years)
                        </div>
                      </div>
                      <div className="ml-4">
                        {skill.matches ? (
                          <Badge className="bg-green-100 text-green-800">Match</Badge>
                        ) : (
                          <Badge variant="destructive">Gap</Badge>
                        )}
                      </div>
                    </div>
                    {skill.evidence && (
                      <div className="mt-3 p-3 bg-white/[0.03] border border-white/10 rounded-lg text-xs">
                        <div className="font-semibold mb-1">Evidence</div>
                        <div className="text-muted-foreground whitespace-pre-wrap">{skill.evidence.cv_snippet}</div>
                        {skill.evidence.source_section && (
                          <div className="text-muted-foreground mt-1">
                            Source: {skill.evidence.source_section}
                          </div>
                        )}
                      </div>
                    )}
                    {!skill.matches && (
                      <div className="mt-2 text-sm text-amber-300 font-semibold">
                        {skill.verification}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsiblePanel>
          )}

          {/* JD Brutal Review */}
          {evaluation.jd_brutal_review && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-orange-700">JD Brutal Review</CardTitle>
                <CardDescription>Quality, clarity, and red flags in the job description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {evaluation.jd_brutal_review.jd_summary && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-semibold mb-1">JD Summary (what the role truly needs):</div>
                    <div className="text-sm">{evaluation.jd_brutal_review.jd_summary}</div>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="text-sm font-semibold">Must-have quality:</div>
                  <Badge variant={evaluation.jd_brutal_review.must_have_quality === 'unclear' ? 'destructive' : 'outline'}>
                    {evaluation.jd_brutal_review.must_have_quality}
                  </Badge>
                </div>

                {evaluation.jd_brutal_review.red_flags_or_concerns?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-700">Red flags / concerns</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {evaluation.jd_brutal_review.red_flags_or_concerns.map((x, idx) => (
                        <li key={idx}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.jd_brutal_review.missing_information?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Missing information</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {evaluation.jd_brutal_review.missing_information.map((x, idx) => (
                        <li key={idx}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.jd_brutal_review.contradictions_or_ambiguities?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Contradictions / ambiguities</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {evaluation.jd_brutal_review.contradictions_or_ambiguities.map((x, idx) => (
                        <li key={idx}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.jd_brutal_review.evaluation_implications?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Implications for evaluation</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {evaluation.jd_brutal_review.evaluation_implications.map((x, idx) => (
                        <li key={idx}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Company Fit Report */}
          {evaluation.company_fit_report && (
            <CollapsiblePanel
              className="mt-6"
              title="Company & Work-Style Fit"
              description="HR-style evaluation beyond technical skills"
              defaultOpen={false}
            >
              <div className="space-y-4">
                {evaluation.company_fit_report.overall_hr_verdict && (
                  <div className="p-4 border border-white/10 rounded-xl bg-white/[0.03]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">Overall HR verdict</div>
                      <Badge variant={evaluation.company_fit_report.overall_hr_verdict.risk_level === 'high' ? 'destructive' : 'outline'}>
                        Risk: {evaluation.company_fit_report.overall_hr_verdict.risk_level}
                      </Badge>
                    </div>
                    <div className="text-sm mb-3">{evaluation.company_fit_report.overall_hr_verdict.one_line}</div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-semibold mb-2 text-green-700">Top reasons to hire</div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {evaluation.company_fit_report.overall_hr_verdict.top_3_reasons_to_hire?.map((x, idx) => (
                            <li key={idx}>{x}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-sm font-semibold mb-2 text-red-700">Top reasons not to hire</div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {evaluation.company_fit_report.overall_hr_verdict.top_3_reasons_not_to_hire?.map((x, idx) => (
                            <li key={idx}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {evaluation.company_fit_report.overall_hr_verdict.biggest_unknowns?.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-semibold mb-2">Biggest unknowns</div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {evaluation.company_fit_report.overall_hr_verdict.biggest_unknowns.map((x, idx) => (
                            <li key={idx}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Recommended next step</div>
                      <Badge>{evaluation.company_fit_report.overall_hr_verdict.recommended_next_step}</Badge>
                    </div>
                  </div>
                )}

                {/* Fit dimensions */}
                {(['work_environment_fit', 'collaboration_communication_fit', 'ownership_leadership_fit'] as const).map((key) => {
                  const item = evaluation.company_fit_report?.[key]
                  if (!item) return null
                  return (
                    <div key={key} className="border border-white/10 rounded-xl bg-white/[0.03] p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          {key === 'work_environment_fit' && 'Work environment fit'}
                          {key === 'collaboration_communication_fit' && 'Collaboration & communication fit'}
                          {key === 'ownership_leadership_fit' && 'Ownership & leadership fit'}
                        </div>
                        <Badge variant={item.fit === 'weak' ? 'destructive' : 'outline'}>Fit: {item.fit}</Badge>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">JD expects:</span> {item.jd_expectations}
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">Candidate signals:</span> {item.candidate_signals}
                      </div>
                      {item.risks?.length > 0 && (
                        <div>
                          <div className="text-sm font-semibold text-red-700 mb-1">Risks</div>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {item.risks.map((x, idx) => (
                              <li key={idx}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.evidence?.cv_snippet && (
                        <div className="mt-3 p-3 bg-white/[0.03] border border-white/10 rounded-lg text-xs">
                          <div className="font-semibold mb-1">Evidence:</div>
                          <div>{item.evidence.cv_snippet}</div>
                          {item.evidence.source_section && (
                            <div className="text-muted-foreground mt-1">Source: {item.evidence.source_section}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CollapsiblePanel>
          )}

          {/* Professional Experience Comparison */}
          {evaluation.professional_experience_comparison && evaluation.professional_experience_comparison.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Professional Experience Comparison</CardTitle>
                <CardDescription>JD responsibilities vs Candidate experience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {evaluation.professional_experience_comparison.map((exp: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold">JD: {exp.jd_responsibility}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Candidate: {exp.candidate_experience}
                          </div>
                        </div>
                        {exp.matches ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                      {!exp.matches && exp.gap && (
                        <div className="mt-2 text-sm text-yellow-700">
                          Gap: {exp.gap} ({exp.severity})
                        </div>
                      )}
                      {exp.evidence && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Evidence from Chunk {exp.evidence.chunk_index}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resume Quality Issues */}
          {evaluation.resume_quality_issues && evaluation.resume_quality_issues.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Resume Quality Issues</CardTitle>
                <CardDescription>Spelling, grammar, and consistency checks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {evaluation.resume_quality_issues.map((issue: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={issue.severity === 'major' ? 'destructive' : 'secondary'}>
                              {issue.type}
                            </Badge>
                            <span className="font-semibold">{issue.issue}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Location: {issue.location}
                          </div>
                          {issue.example && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                              &quot;{issue.example}&quot;
                            </div>
                          )}
                        </div>
                        <Badge variant={issue.severity === 'major' ? 'destructive' : 'outline'}>
                          {issue.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Portfolio Links */}
          {evaluation.portfolio_links && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Portfolio & Links</CardTitle>
                <CardDescription>Candidate&apos;s online presence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {evaluation.portfolio_links.linkedin && (
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      <a
                        href={evaluation.portfolio_links.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        LinkedIn
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {evaluation.portfolio_links.github && (
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      <a
                        href={evaluation.portfolio_links.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        GitHub
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {evaluation.portfolio_links.portfolio && (
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      <a
                        href={evaluation.portfolio_links.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Portfolio
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {evaluation.portfolio_links.other_links && evaluation.portfolio_links.other_links.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold mb-1">Other Links:</div>
                      {evaluation.portfolio_links.other_links.map((link: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4" />
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                          >
                            {link}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                  {evaluation.portfolio_links.missing_expected && evaluation.portfolio_links.missing_expected.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-sm font-semibold text-yellow-800 mb-1">Missing Expected Links:</div>
                      <ul className="list-disc list-inside text-sm text-yellow-700">
                        {evaluation.portfolio_links.missing_expected.map((missing: string, idx: number) => (
                          <li key={idx}>{missing}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Comparison */}
          {evaluation.detailed_comparison && evaluation.detailed_comparison.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Detailed JD vs Candidate Comparison</CardTitle>
                <CardDescription>Side-by-side analysis of all requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {evaluation.detailed_comparison.map((comp: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline">{comp.category}</Badge>
                        <div className="flex items-center gap-2">
                          {comp.match_status === 'perfect_match' && (
                            <Badge className="bg-green-100 text-green-800">Perfect Match</Badge>
                          )}
                          {comp.match_status === 'partial_match' && (
                            <Badge className="bg-yellow-100 text-yellow-800">Partial Match</Badge>
                          )}
                          {comp.match_status === 'no_match' && (
                            <Badge variant="destructive">No Match</Badge>
                          )}
                          {comp.match_status === 'exceeds' && (
                            <Badge className="bg-blue-100 text-blue-800">Exceeds</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-3 bg-red-50 border border-red-200 rounded">
                          <div className="text-xs font-semibold text-red-800 mb-1">JD Requirement:</div>
                          <div className="text-sm">{comp.jd_requirement}</div>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="text-xs font-semibold text-blue-800 mb-1">Candidate Evidence:</div>
                          <div className="text-sm">{comp.candidate_evidence || 'Not found'}</div>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-muted rounded">
                        <div className="text-sm font-semibold mb-1">Gap Analysis:</div>
                        <div className="text-sm">{comp.gap_description}</div>
                        <div className="mt-2">
                          <Badge variant={comp.severity === 'critical' ? 'destructive' : 'outline'}>
                            {comp.severity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Matching Strengths */}
          {evaluation.matching_strengths && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-green-700">Matching Strengths</CardTitle>
                <CardDescription>Skills and experience that match job requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {evaluation.matching_strengths.skills_that_match && evaluation.matching_strengths.skills_that_match.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Skills That Match
                    </h3>
                    <div className="space-y-3">
                      {evaluation.matching_strengths.skills_that_match.map((skill: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-green-500 pl-4 py-2">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-lg">{skill.skill}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                JD: {skill.jd_requirement}
                              </div>
                              <div className="text-sm text-green-700 mt-1">
                                Candidate: {skill.candidate_evidence}
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              {skill.match_percentage}% Match
                            </Badge>
                          </div>
                          {skill.evidence && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-xs border border-green-200">
                              <div className="font-semibold mb-1 text-green-800">Evidence:</div>
                              <div className="text-green-900">&quot;{skill.evidence.cv_snippet}&quot;</div>
                              <div className="text-green-700 mt-1">
                                Chunk {skill.evidence.chunk_index}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evaluation.matching_strengths.experience_that_matches && evaluation.matching_strengths.experience_that_matches.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Experience That Matches
                    </h3>
                    <div className="space-y-3">
                      {evaluation.matching_strengths.experience_that_matches.map((exp: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-green-500 pl-4 py-2">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold">{exp.experience}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                JD: {exp.jd_requirement}
                              </div>
                              <div className="text-sm text-green-700 mt-1">
                                Candidate: {exp.candidate_evidence}
                              </div>
                              {exp.gap && (
                                <div className="text-xs text-yellow-700 mt-1">
                                  Note: {exp.gap}
                                </div>
                              )}
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              {exp.match_percentage}% Match
                            </Badge>
                          </div>
                          {exp.evidence && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-xs border border-green-200">
                              <div className="text-green-700">
                                Evidence from Chunk {exp.evidence.chunk_index}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Missing Gaps */}
          {evaluation.missing_gaps && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-red-700">Missing Gaps</CardTitle>
                <CardDescription>What the candidate is missing for this role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {evaluation.missing_gaps.technology_gaps && evaluation.missing_gaps.technology_gaps.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-700 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Technology Gaps
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      {evaluation.missing_gaps.technology_gaps.map((gap: string, idx: number) => (
                        <li key={idx} className="text-sm">{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.missing_gaps.experience_gaps && evaluation.missing_gaps.experience_gaps.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-700 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Experience Gaps
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      {evaluation.missing_gaps.experience_gaps.map((gap: string, idx: number) => (
                        <li key={idx} className="text-sm">{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.missing_gaps.skill_gaps && evaluation.missing_gaps.skill_gaps.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-700 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Skill Gaps
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      {evaluation.missing_gaps.skill_gaps.map((gap: string, idx: number) => (
                        <li key={idx} className="text-sm">{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.missing_gaps.other_gaps && evaluation.missing_gaps.other_gaps.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-700 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Other Gaps
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      {evaluation.missing_gaps.other_gaps.map((gap: string, idx: number) => (
                        <li key={idx} className="text-sm">{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Brutal Gap Analysis */}
          {evaluation.brutal_gap_analysis && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-red-700">Brutal Gap Analysis</CardTitle>
                <CardDescription>Critical analysis of gaps with indirect experience assessment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {evaluation.brutal_gap_analysis.critical_gaps && evaluation.brutal_gap_analysis.critical_gaps.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Critical Gaps (Deal-Breakers)
                    </h3>
                    <div className="space-y-3">
                      {evaluation.brutal_gap_analysis.critical_gaps.map((gap: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-red-500 pl-4 py-3 bg-red-50 rounded">
                          <div className="font-semibold text-red-800 mb-2">{gap.gap}</div>
                          <div className="text-sm space-y-1">
                            <div><strong>Impact:</strong> {gap.impact}</div>
                            <div><strong>JD Requires:</strong> {gap.jd_requirement}</div>
                            <div><strong>Candidate Has:</strong> {gap.candidate_has}</div>
                            {gap.indirect_experience && (
                              <div className="text-yellow-700 mt-2">
                                <strong>Indirect Experience:</strong> {gap.indirect_experience}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evaluation.brutal_gap_analysis.major_gaps && evaluation.brutal_gap_analysis.major_gaps.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-orange-700">Major Gaps</h3>
                    <div className="space-y-3">
                      {evaluation.brutal_gap_analysis.major_gaps.map((gap: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-orange-500 pl-4 py-3 bg-orange-50 rounded">
                          <div className="font-semibold text-orange-800 mb-2">{gap.gap}</div>
                          <div className="text-sm space-y-1">
                            <div><strong>Impact:</strong> {gap.impact}</div>
                            <div><strong>JD Requires:</strong> {gap.jd_requirement}</div>
                            <div><strong>Candidate Has:</strong> {gap.candidate_has}</div>
                            {gap.indirect_experience && (
                              <div className="text-yellow-700 mt-2">
                                <strong>Indirect Experience:</strong> {gap.indirect_experience}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evaluation.brutal_gap_analysis.moderate_gaps && evaluation.brutal_gap_analysis.moderate_gaps.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-yellow-700">Moderate Gaps</h3>
                    <div className="space-y-3">
                      {evaluation.brutal_gap_analysis.moderate_gaps.map((gap: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-yellow-500 pl-4 py-3 bg-yellow-50 rounded">
                          <div className="font-semibold text-yellow-800 mb-2">{gap.gap}</div>
                          <div className="text-sm space-y-1">
                            <div><strong>Impact:</strong> {gap.impact}</div>
                            <div><strong>JD Requires:</strong> {gap.jd_requirement}</div>
                            <div><strong>Candidate Has:</strong> {gap.candidate_has}</div>
                            {gap.indirect_experience && (
                              <div className="text-yellow-700 mt-2">
                                <strong>Indirect Experience:</strong> {gap.indirect_experience}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evaluation.brutal_gap_analysis.indirect_experience_analysis && evaluation.brutal_gap_analysis.indirect_experience_analysis.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-blue-700">Indirect Experience Analysis</h3>
                    <CardDescription className="mb-3">
                      What the candidate has that&apos;s related but not exact - transferability assessment
                    </CardDescription>
                    <div className="space-y-3">
                      {evaluation.brutal_gap_analysis.indirect_experience_analysis.map((indirect: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="grid md:grid-cols-2 gap-4 mb-3">
                            <div className="p-3 bg-red-50 border border-red-200 rounded">
                              <div className="text-xs font-semibold text-red-800 mb-1">Required:</div>
                              <div className="text-sm text-red-900">{indirect.required}</div>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                              <div className="text-xs font-semibold text-blue-800 mb-1">Candidate Has:</div>
                              <div className="text-sm text-blue-900">{indirect.candidate_indirect}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge variant={indirect.transferability === 'High' ? 'default' : indirect.transferability === 'Medium' ? 'secondary' : 'outline'}>
                                Transferability: {indirect.transferability}
                              </Badge>
                              <Badge variant={indirect.gap_severity === 'critical' ? 'destructive' : 'secondary'} className="ml-2">
                                {indirect.gap_severity}
                              </Badge>
                            </div>
                          </div>
                          {indirect.evidence && (
                            <div className="mt-3 text-xs text-muted-foreground">
                              Evidence: Chunk {indirect.evidence.chunk_index}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Standard Evaluation Display */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Detailed Evaluation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            {evaluation.strengths && evaluation.strengths.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-green-700">Strengths</h3>
                <ul className="list-disc list-inside space-y-1">
                  {evaluation.strengths.map((strength, idx) => (
                    <li key={idx} className="text-sm">
                      <strong>{strength.point}</strong>
                      {strength.evidence && (
                        <span className="text-muted-foreground ml-2">
                          ({strength.evidence})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.concerns && evaluation.concerns.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-yellow-700">Concerns</h3>
                <ul className="list-disc list-inside space-y-1">
                  {evaluation.concerns.map((concern, idx) => (
                    <li key={idx} className="text-sm">
                      <strong>{concern.point}</strong>
                      {concern.evidence && (
                        <span className="text-muted-foreground ml-2">
                          ({concern.evidence})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.criteria_matches && evaluation.criteria_matches.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Criteria Matches</h3>
                <div className="space-y-4">
                  {evaluation.criteria_matches.map((match, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="font-semibold">{match.criterion}</div>
                          <div className="text-xs text-muted-foreground">
                            Weight: {(match.weight * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">
                            {match.overall_match_percentage 
                              ? `${match.overall_match_percentage}%`
                              : `${(match.score * 100).toFixed(0)}%`}
                          </div>
                          <div className="text-xs text-muted-foreground">Match</div>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ 
                            width: `${match.overall_match_percentage || (match.score * 100)}%` 
                          }}
                        />
                      </div>
                      {match.sub_criteria_analysis && match.sub_criteria_analysis.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground mb-2">
                            Sub-Criteria:
                          </div>
                          {match.sub_criteria_analysis.map((sub: any, subIdx: number) => (
                            <div key={subIdx} className="pl-3 border-l-2 border-blue-300">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">{sub.sub_criterion}</span>
                                <span className="text-sm font-semibold">{sub.match_percentage}%</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                JD: {sub.jd_requirement} | Candidate: {sub.candidate_has || 'Not mentioned'}
                              </div>
                              {sub.missing && sub.missing.length > 0 && (
                                <div className="text-xs text-red-600 mt-1">
                                  Missing: {sub.missing.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {match.reasoning && (
                        <div className="mt-2 text-xs text-muted-foreground italic">
                          {match.reasoning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}

      {timeline && timeline.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Candidate activity history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline.map((log, idx) => (
                <div key={log.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {idx < timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-border min-h-[40px]" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium capitalize">
                          {log.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                        {JSON.stringify(log.metadata, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Draft</DialogTitle>
            <DialogDescription>
              {emailType === 'invite' && 'Interview invitation email'}
              {emailType === 'reject' && 'Rejection email'}
              {emailType === 'hold' && 'On hold email'}
            </DialogDescription>
          </DialogHeader>
          {emailDraft && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Subject:</label>
                <div className="mt-1 p-2 bg-muted rounded">{emailDraft.subject}</div>
              </div>
              <div>
                <label className="text-sm font-semibold">Body:</label>
                <div className="mt-1 p-4 bg-muted rounded whitespace-pre-wrap">
                  {emailDraft.body}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={handleCopyEmail} disabled={!emailDraft}>
              Copy to Clipboard
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={!emailDraft || !evaluation || sendEmailMutation.isPending}
            >
              {sendEmailMutation.isPending ? 'Sending...' : 'Send Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Candidate Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Candidate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this candidate? This action cannot be undone and will also delete all associated evaluations and email drafts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteCandidateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCandidate}
              disabled={deleteCandidateMutation.isPending}
            >
              {deleteCandidateMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

