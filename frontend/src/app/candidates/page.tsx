'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
import { Users, FileText, TrendingUp, Award, Filter, Search, ArrowRight, Sparkles } from 'lucide-react'
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }
  }
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
    filtered.sort((a, b) => {
      const aEval = a.evaluation
      const bEval = b.evaluation

      if (aEval && bEval) {
        const aScore = aEval.overall_match_score ?? 0
        const bScore = bEval.overall_match_score ?? 0
        
        if (Math.abs(aScore - bScore) > 0.01) {
          return bScore - aScore
        }
        
        return bEval.confidence - aEval.confidence
      }

      if (aEval && !bEval) return -1
      if (!aEval && bEval) return 1

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return filtered
  }, [candidates, jobFilter, searchQuery])

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400'
    if (score >= 0.6) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500/10 border-green-500/20'
    if (score >= 0.6) return 'bg-amber-500/10 border-amber-500/20'
    return 'bg-red-500/10 border-red-500/20'
  }

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'yes':
        return (
          <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg shadow-green-500/25">
            Strong Hire
          </Badge>
        )
      case 'maybe':
        return (
          <Badge className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white border-0">
            Consider
          </Badge>
        )
      case 'no':
        return (
          <Badge variant="destructive" className="shadow-lg">
            Not a Fit
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">All Candidates</h1>
        </div>
        <p className="text-muted-foreground">
          View and manage all candidates across all job postings, sorted by best match score
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  placeholder="Search by name, email, or job title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-2 focus:border-purple-500/50"
                />
              </div>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="w-full sm:w-[250px] border-2">
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
      </motion.div>

      {/* Candidates List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse border-2">
              <CardContent className="py-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filteredAndSortedCandidates || filteredAndSortedCandidates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 border-dashed bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl">
                  <Users className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">No candidates found</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                {searchQuery || jobFilter !== 'all'
                  ? 'Try adjusting your filters to see more candidates.'
                  : 'No candidates have been uploaded yet. Upload CVs from job pages to get started.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredAndSortedCandidates.length}</span> candidate{filteredAndSortedCandidates.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid gap-4">
            {filteredAndSortedCandidates.map((candidate) => {
              const evaluation = candidate.evaluation
              const matchScore = evaluation?.overall_match_score ?? 0
              const confidence = evaluation?.confidence ?? 0

              return (
                <motion.div
                  key={candidate.id}
                  variants={itemVariants}
                  whileHover={{ y: -2, scale: 1.01 }}
                >
                  <Link href={`/jobs/${candidate.job_id}/candidates/${candidate.id}`}>
                    <Card className="group border-2 hover:border-purple-500/50 transition-all duration-300 cursor-pointer overflow-hidden relative">
                      {/* Gradient accent */}
                      {evaluation && matchScore >= 0.8 && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-bl-full" />
                      )}
                      
                      <CardContent className="py-6 relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0">
                                {candidate.name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                  {candidate.name || candidate.cv_filename}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                  {candidate.email && (
                                    <span className="truncate">{candidate.email}</span>
                                  )}
                                  {candidate.job_title && (
                                    <>
                                      <span>•</span>
                                      <Badge variant="outline" className="text-xs border-purple-200 dark:border-purple-800">
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
                              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className={cn("p-4 rounded-xl border-2", getScoreBgColor(matchScore))}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                      <TrendingUp className="h-3.5 w-3.5" />
                                      Match Score
                                    </span>
                                    <span className={cn("text-lg font-bold", getScoreColor(matchScore))}>
                                      {(matchScore * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Progress 
                                    value={matchScore * 100} 
                                    className="h-2"
                                  />
                                </div>
                                <div className={cn("p-4 rounded-xl border-2", getScoreBgColor(confidence))}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                      <Award className="h-3.5 w-3.5" />
                                      Confidence
                                    </span>
                                    <span className={cn("text-lg font-bold", getScoreColor(confidence))}>
                                      {(confidence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Progress 
                                    value={confidence * 100} 
                                    className="h-2"
                                  />
                                </div>
                              </div>
                            )}

                            {!evaluation && (
                              <div className="mt-4">
                                <Badge variant="secondary" className="text-xs bg-muted">
                                  <Sparkles className="w-3 h-3 mr-1.5" />
                                  Pending AI Evaluation
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right text-xs text-muted-foreground">
                              <div className="font-medium mb-1">{format(new Date(candidate.created_at), 'MMM d, yyyy')}</div>
                              {candidate.status && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {candidate.status}
                                </Badge>
                              )}
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
