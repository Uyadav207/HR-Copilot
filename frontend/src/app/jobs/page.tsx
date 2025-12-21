'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { apiRequest } from '@/lib/api'
import { Job } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Plus, CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

async function fetchJobs(): Promise<Job[]> {
  return apiRequest<Job[]>('/api/jobs')
}

export default function JobsPage() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Postings</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your job openings
          </p>
        </div>
        <Link href="/jobs/new">
          <Button size="lg" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        </Link>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse h-full flex flex-col min-h-[180px]">
              <CardHeader className="flex-1">
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !jobs || jobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No jobs yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              Get started by creating your first job posting. Our AI will help you parse and structure it.
            </p>
            <Link href="/jobs/new">
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Job
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/50 h-full flex flex-col min-h-[180px]">
                <CardHeader className="flex-1 min-h-0">
                  <div className="flex items-start justify-between gap-2 h-full">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {job.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="truncate">{format(new Date(job.created_at), 'MMM d, yyyy')}</span>
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="flex items-center justify-between gap-2">
                    {job.blueprint ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600 dark:text-gray-900 shrink-0">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        <Clock className="mr-1 h-3 w-3" />
                        Processing
                      </Badge>
                    )}
                    {job.blueprint && (
                      <span className="text-xs text-muted-foreground truncate">
                        {job.blueprint.required_skills?.length || 0} skills
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

