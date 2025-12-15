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
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Trash2, MoreVertical } from 'lucide-react'
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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Candidate not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          ← Back
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {candidate.name || candidate.cv_filename}
            </h1>
            {candidate.email && (
              <p className="text-muted-foreground">{candidate.email}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{candidate.status}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0">
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

      <div className="grid gap-6 md:grid-cols-2">
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
            {!evaluation ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  No evaluation yet. Click below to evaluate this candidate.
                </p>
                <Button
                  onClick={() => evaluateMutation.mutate()}
                  disabled={evaluateMutation.isPending || !candidate.profile}
                >
                  {evaluateMutation.isPending ? 'Evaluating...' : 'Evaluate Candidate'}
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

      {evaluation && (
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
                <div className="space-y-2">
                  {evaluation.criteria_matches.map((match, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span>{match.criterion}</span>
                        <span className="text-muted-foreground">
                          {(match.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${match.score * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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

