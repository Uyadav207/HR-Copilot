'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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
import { cn } from '@/lib/utils'
import { ToastAction } from '@/components/ui/toast'

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
    refetchInterval: (query) => {
      // Poll every 3 seconds if there are unparsed candidates
      const data = query.state.data as Candidate[] | undefined
      if (data && data.some(c => !c.profile)) {
        return 3000 // Poll every 3 seconds
      }
      return false // Stop polling when all are parsed
    },
  })

  // Track previous candidate states to detect when CVs are parsed
  const previousCandidatesRef = useRef<Map<string, { hasProfile: boolean; status: string }>>(new Map())

  useEffect(() => {
    if (!candidates) return

    // Check for newly parsed candidates
    candidates.forEach((candidate) => {
      const previous = previousCandidatesRef.current.get(candidate.id)
      const currentHasProfile = candidate.profile !== null
      const currentStatus = candidate.status

      // If candidate was previously unparsed and now has a profile
      // Only show notification if we had a previous state (not initial load)
      if (previous && !previous.hasProfile && currentHasProfile) {
        const candidateName = candidate.name || candidate.cv_filename
        
        toast({
          title: 'CV Parsed Successfully! 🎉',
          description: `${candidateName} is now ready to view.`,
          variant: 'success',
          action: (
            <ToastAction
              altText="View CV"
              onClick={() => {
                router.push(`/jobs/${jobId}/candidates/${candidate.id}`)
              }}
              className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600 dark:text-gray-900 border-0"
            >
              View CV
            </ToastAction>
          ),
        })
      }

      // Update the ref with current state (or initialize if first time)
      if (!previous) {
        // First time seeing this candidate - initialize without showing notification
        previousCandidatesRef.current.set(candidate.id, {
          hasProfile: currentHasProfile,
          status: currentStatus,
        })
      } else {
        // Update existing state
        previousCandidatesRef.current.set(candidate.id, {
          hasProfile: currentHasProfile,
          status: currentStatus,
        })
      }
    })

    // Clean up refs for candidates that no longer exist
    const currentIds = new Set(candidates.map(c => c.id))
    previousCandidatesRef.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        previousCandidatesRef.current.delete(id)
      }
    })
  }, [candidates, jobId, router, toast])

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
            The job you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <Link href="/jobs">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </Link>
        <div className="relative">
          <div className="absolute -top-6 -left-6 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{job.title}</h1>
                {job.blueprint ? (
                  <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg shadow-green-500/25">
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
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
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 shadow-lg shadow-purple-500/25">
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
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Job Blueprint - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="border-2 hover:border-purple-500/30 transition-all overflow-hidden relative">
              {/* Gradient accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-bl-full" />
              
              <CardHeader className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Job Blueprint</CardTitle>
                    <CardDescription>AI-parsed job requirements and evaluation criteria</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
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
                              className={cn(
                                "text-sm py-1.5 px-3 border transition-all",
                                skill.priority === 'must_have' 
                                  ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/25"
                                  : "border-border bg-card hover:bg-accent hover:border-purple-500/30"
                              )}
                            >
                              {skill.skill}
                              {skill.years_preferred && (
                                <span className={cn("ml-1.5", skill.priority === 'must_have' ? 'opacity-90' : 'opacity-75')}>
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
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl animate-pulse" />
                    <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl">
                      <Sparkles className="h-8 w-8 text-white animate-pulse" />
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-2 font-medium">Blueprint parsing in progress...</p>
                  <p className="text-xs text-muted-foreground">
                    This usually takes a few moments
                  </p>
                </div>
              )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Candidates Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          <Card className="border-2 hover:border-purple-500/30 transition-all overflow-hidden relative">
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Candidates</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Manage applications and evaluations
                    </CardDescription>
                  </div>
                </div>
                {candidates && candidates.length > 0 && (
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                    {candidates.length}
                  </Badge>
                )}
              </div>
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
                  {candidates.map((candidate, idx) => {
                    const isParsed = candidate.profile !== null
                    const candidateCard = (
                      <Card className={cn(
                        "transition-all duration-300 border-2 relative overflow-hidden",
                        isParsed 
                          ? "hover:bg-accent/50 cursor-pointer hover:border-purple-500/50 hover:shadow-md" 
                          : "opacity-60 cursor-not-allowed"
                      )}>
                        {isParsed && (
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-bl-full" />
                        )}
                        <CardContent className="py-3 relative z-10">
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
                              {!isParsed && (
                                <p className="text-xs text-muted-foreground mt-1 italic flex items-center gap-1">
                                  <Clock className="h-3 w-3 animate-pulse" />
                                  CV parsing in progress...
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
                                className={cn(
                                  "shrink-0 text-xs",
                                  candidate.status === 'evaluated' && "bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0",
                                  candidate.status === 'invited' && "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0"
                                )}
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
                    )

                    return (
                      <div key={candidate.id} className="relative group">
                        {isParsed ? (
                          <Link href={`/jobs/${jobId}/candidates/${candidate.id}`}>
                            {candidateCard}
                          </Link>
                        ) : (
                          <div onClick={(e) => {
                            e.preventDefault()
                            toast({
                              title: "CV Not Parsed",
                              description: "Please wait for the CV to be parsed before viewing the candidate profile.",
                              variant: "default",
                            })
                          }}>
                            {candidateCard}
                          </div>
                        )}
                      </div>
                    )
                  })}
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
          </motion.div>
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

