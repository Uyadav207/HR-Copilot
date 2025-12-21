'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { apiRequest } from '@/lib/api'
import { Candidate, Evaluation } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, FileText, TrendingUp, Award, Filter, Search, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface CandidateWithEvaluation extends Candidate {
  job_title: string
  evaluation: Evaluation | null
}

async function fetchAllCandidates(): Promise<CandidateWithEvaluation[]> {
  return apiRequest<CandidateWithEvaluation[]>('/api/candidates')
}

export default function CandidatesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [jobFilter, setJobFilter] = useState<string>('all')

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['all-candidates'],
    queryFn: fetchAllCandidates,
  })

  // Get unique job titles for filter
  const jobTitles = useMemo(() => {
    if (!candidates) return []
    const titles = new Set(candidates.map(c => c.job_title).filter(Boolean))
    return Array.from(titles).sort()
  }, [candidates])

  // Filter and sort candidates
  const filteredAndSortedCandidates = useMemo(() => {
    if (!candidates) return []

    let filtered = candidates

    // Filter by job title
    if (jobFilter !== 'all') {
      filtered = filtered.filter(c => c.job_title === jobFilter)
    }

    // Filter by search query (name, email, or job title)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.job_title?.toLowerCase().includes(query)
      )
    }

    // Sort by evaluation score and confidence (highest first)
    // Candidates with evaluations come first, sorted by overall_match_score and confidence
    // Then candidates without evaluations
    filtered.sort((a, b) => {
      const aEval = a.evaluation
      const bEval = b.evaluation

      // Both have evaluations - sort by score and confidence
      if (aEval && bEval) {
        const aScore = aEval.overall_match_score ?? 0
        const bScore = bEval.overall_match_score ?? 0
        
        if (Math.abs(aScore - bScore) > 0.01) {
          return bScore - aScore // Higher score first
        }
        
        // If scores are similar, sort by confidence
        return bEval.confidence - aEval.confidence
      }

      // Only one has evaluation - that one comes first
      if (aEval && !bEval) return -1
      if (!aEval && bEval) return 1

      // Neither has evaluation - sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return filtered
  }, [candidates, jobFilter, searchQuery])

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-700 dark:text-green-400'
    if (score >= 0.6) return 'text-amber-700 dark:text-amber-400'
    return 'text-red-700 dark:text-red-400'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-700 dark:text-green-400'
    if (confidence >= 0.6) return 'text-amber-700 dark:text-amber-400'
    return 'text-red-700 dark:text-red-400'
  }

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'yes':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600 dark:text-gray-900">Yes</Badge>
      case 'maybe':
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-gray-900">Maybe</Badge>
      case 'no':
        return <Badge variant="destructive">No</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">All Candidates</h1>
        <p className="text-muted-foreground">
          View and manage all candidates across all job postings, sorted by best match score
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or job title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filter by job title" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobTitles.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filteredAndSortedCandidates || filteredAndSortedCandidates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              {searchQuery || jobFilter !== 'all'
                ? 'Try adjusting your filters to see more candidates.'
                : 'No candidates have been uploaded yet. Upload CVs from job pages to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredAndSortedCandidates.length} candidate{filteredAndSortedCandidates.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid gap-4">
            {filteredAndSortedCandidates.map((candidate) => {
              const evaluation = candidate.evaluation
              const matchScore = evaluation?.overall_match_score ?? 0
              const confidence = evaluation?.confidence ?? 0

              return (
                <Link
                  key={candidate.id}
                  href={`/jobs/${candidate.job_id}/candidates/${candidate.id}`}
                >
                  <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/50">
                    <CardContent className="py-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                                {candidate.name || candidate.cv_filename}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                {candidate.email && (
                                  <span className="truncate">{candidate.email}</span>
                                )}
                                {candidate.job_title && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-xs">
                                      {candidate.job_title}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                            {evaluation && getDecisionBadge(evaluation.decision)}
                          </div>

                          {/* Scores */}
                          {evaluation && (
                            <div className="mt-4 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg border bg-background">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" />
                                      Match Score
                                    </span>
                                    <span className={cn("text-sm font-bold", getScoreColor(matchScore))}>
                                      {(matchScore * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Progress value={matchScore * 100} className="h-2" />
                                </div>
                                <div className="p-3 rounded-lg border bg-background">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                      <Award className="h-3 w-3" />
                                      Confidence
                                    </span>
                                    <span className={cn("text-sm font-bold", getConfidenceColor(confidence))}>
                                      {(confidence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Progress value={confidence * 100} className="h-2" />
                                </div>
                              </div>
                            </div>
                          )}

                          {!evaluation && (
                            <div className="mt-4">
                              <Badge variant="secondary" className="text-xs">
                                Not evaluated yet
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right text-xs text-muted-foreground">
                            <div>{format(new Date(candidate.created_at), 'MMM d, yyyy')}</div>
                            {candidate.status && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {candidate.status}
                              </Badge>
                            )}
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
