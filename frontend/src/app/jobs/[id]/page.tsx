'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiRequest } from '@/lib/api'
import { Job, Candidate } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Upload, Users, Sparkles, Clock, CheckCircle2, AlertCircle, Edit, Trash2, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

async function fetchJob(id: string): Promise<Job> {
  return apiRequest<Job>(`/api/jobs/${id}`)
}

async function fetchCandidates(jobId: string): Promise<Candidate[]> {
  return apiRequest<Candidate[]>(`/api/jobs/${jobId}/candidates`)
}

async function deleteCandidate(candidateId: string): Promise<void> {
  return apiRequest<void>(`/api/candidates/${candidateId}`, {
    method: 'DELETE',
  })
}

async function updateJob(id: string, data: { title: string; raw_description: string }): Promise<Job> {
  return apiRequest<Job>(`/api/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

async function deleteJob(id: string): Promise<void> {
  return apiRequest<void>(`/api/jobs/${id}`, {
    method: 'DELETE',
  })
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const jobId = params.id as string
  const { toast } = useToast()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteCandidateDialogOpen, setDeleteCandidateDialogOpen] = useState(false)
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => fetchJob(jobId),
  })

  const { data: candidates, isLoading: candidatesLoading, refetch: refetchCandidates } = useQuery({
    queryKey: ['candidates', jobId],
    queryFn: () => fetchCandidates(jobId),
    enabled: !!jobId,
    refetchOnWindowFocus: true,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { title: string; raw_description: string }) => updateJob(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setEditDialogOpen(false)
      toast({
        title: 'Job updated',
        description: 'The job has been successfully updated.',
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update job',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setDeleteDialogOpen(false)
      toast({
        title: 'Job deleted',
        description: 'The job has been successfully deleted.',
        variant: 'success',
      })
      router.push('/jobs')
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete job',
        variant: 'destructive',
      })
    },
  })

  const handleEditOpen = () => {
    if (job) {
      setEditTitle(job.title)
      setEditDescription(job.raw_description)
      setEditDialogOpen(true)
    }
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim() || !editDescription.trim()) {
      toast({
        title: 'Validation error',
        description: 'Title and description are required',
        variant: 'destructive',
      })
      return
    }
    updateMutation.mutate({ title: editTitle, raw_description: editDescription })
  }

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  const deleteCandidateMutation = useMutation({
    mutationFn: (candidateId: string) => deleteCandidate(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', jobId] })
      setDeleteCandidateDialogOpen(false)
      setCandidateToDelete(null)
      toast({
        title: 'Candidate deleted',
        description: 'The candidate has been successfully deleted.',
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete candidate',
        variant: 'destructive',
      })
    },
  })

  const handleDeleteCandidate = (candidateId: string) => {
    setCandidateToDelete(candidateId)
    setDeleteCandidateDialogOpen(true)
  }

  const confirmDeleteCandidate = () => {
    if (candidateToDelete) {
      deleteCandidateMutation.mutate(candidateToDelete)
    }
  }

  if (jobLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Job not found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            The job you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Link href="/jobs">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
              {job.blueprint ? (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Ready
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="mr-1 h-3 w-3" />
                  Processing
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Created {format(new Date(job.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/jobs/${jobId}/candidates/upload`}>
              <Button size="lg">
                <Upload className="mr-2 h-4 w-4" />
                Upload CVs
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="h-10 w-10 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleEditOpen}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit Job</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Job</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Job Blueprint - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Job Blueprint</CardTitle>
              </div>
              <CardDescription>AI-parsed job requirements and evaluation criteria</CardDescription>
            </CardHeader>
            <CardContent>
              {job.blueprint ? (
                <div className="space-y-6">
                  {job.blueprint.required_skills && job.blueprint.required_skills.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                        Required Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {job.blueprint.required_skills.map((skill, idx) => (
                          <Badge
                            key={idx}
                            variant={skill.priority === 'must_have' ? 'default' : 'secondary'}
                            className="text-sm py-1.5 px-3"
                          >
                            {skill.skill}
                            {skill.years_preferred && (
                              <span className="ml-1.5 opacity-75">
                                ({skill.years_preferred}+ yrs)
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {job.blueprint.experience_range && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">
                          Experience Range
                        </h3>
                        <p className="text-base">
                          {job.blueprint.experience_range.min_years || 0} -{' '}
                          {job.blueprint.experience_range.max_years || '∞'} years
                        </p>
                      </div>
                    </>
                  )}

                  {job.blueprint.evaluation_criteria && job.blueprint.evaluation_criteria.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                          Evaluation Criteria
                        </h3>
                        <div className="space-y-3">
                          {job.blueprint.evaluation_criteria.map((crit, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-sm">{crit.criterion}</span>
                              <Badge variant="outline" className="ml-4">
                                {(crit.weight * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {job.blueprint.responsibilities && job.blueprint.responsibilities.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                          Key Responsibilities
                        </h3>
                        <ul className="space-y-2">
                          {job.blueprint.responsibilities.map((resp, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-1.5">•</span>
                              <span>{resp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                    <Sparkles className="h-6 w-6 text-muted-foreground animate-pulse" />
                  </div>
                  <p className="text-muted-foreground mb-2">Blueprint parsing in progress...</p>
                  <p className="text-xs text-muted-foreground">
                    This usually takes a few moments
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Candidates Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>Candidates</CardTitle>
                </div>
                {candidates && candidates.length > 0 && (
                  <Badge variant="secondary">{candidates.length}</Badge>
                )}
              </div>
              <CardDescription>
                Manage candidate applications and evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {candidatesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              ) : !candidates || candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium mb-1">No candidates yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Upload CVs to start evaluating candidates
                  </p>
                  <Link href={`/jobs/${jobId}/candidates/upload`}>
                    <Button size="sm" variant="outline">
                      <Upload className="mr-2 h-3 w-3" />
                      Upload CVs
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {candidates.map((candidate) => (
                    <div key={candidate.id} className="relative group">
                      <Link href={`/jobs/${jobId}/candidates/${candidate.id}`}>
                        <Card className="hover:bg-accent cursor-pointer transition-colors border-2 hover:border-primary/50">
                          <CardContent className="py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {candidate.name || candidate.cv_filename}
                                </p>
                                {candidate.email && (
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {candidate.email}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    candidate.status === 'evaluated'
                                      ? 'default'
                                      : candidate.status === 'invited'
                                      ? 'default'
                                      : 'outline'
                                  }
                                  className="shrink-0 text-xs"
                                >
                                  {candidate.status}
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                      }}
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                      <span className="sr-only">Open menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleDeleteCandidate(candidate.id)
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                                      <span>Delete</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  ))}
                  <Link href={`/jobs/${jobId}/candidates/upload`}>
                    <Button variant="outline" className="w-full mt-4" size="sm">
                      <Upload className="mr-2 h-3 w-3" />
                      Upload More CVs
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Job Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>
              Update the job title and description
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Job Title</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g., Senior Backend Engineer"
                  required
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Job Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Job description..."
                  rows={15}
                  required
                  disabled={updateMutation.isPending}
                  className="resize-none font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Job'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job? This action cannot be undone and will also delete all associated candidates and evaluations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Candidate Confirmation Dialog */}
      <Dialog open={deleteCandidateDialogOpen} onOpenChange={setDeleteCandidateDialogOpen}>
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
              onClick={() => {
                setDeleteCandidateDialogOpen(false)
                setCandidateToDelete(null)
              }}
              disabled={deleteCandidateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCandidate}
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

