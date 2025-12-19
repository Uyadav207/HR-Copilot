'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, Users, FileText, TrendingUp, Sparkles, Clock } from 'lucide-react'
import { apiRequest } from '@/lib/api'
import { Job } from '@/types'
import { format } from 'date-fns'
import { AnimatedCounter } from '@/components/ui/animated-counter'

async function fetchJobs(): Promise<Job[]> {
  return apiRequest<Job[]>('/api/jobs')
}

export default function Home() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  })

  const recentJobs = jobs?.slice(0, 3) || []
  const totalJobs = jobs?.length || 0

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Manage your hiring pipeline with AI-powered insights
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/jobs/new">
            <Button size="lg" className="w-full sm:w-auto">
              <Sparkles className="h-4 w-4 mr-2" />
              Create job with AI
            </Button>
          </Link>
          <Link href="/jobs">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Briefcase className="h-4 w-4 mr-2" />
              View jobs
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalJobs} />
            </div>
            <p className="text-xs text-muted-foreground">Tracked job postings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Across all jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">AI assessments completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">Powered by AI</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link href="/jobs/new" className="flex-1 min-w-[200px]">
                <div className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-primary/20 bg-primary/5 p-4 cursor-pointer">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary text-primary-foreground mb-3">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-center">Create New Job</span>
                </div>
              </Link>
              <Link href="/jobs" className="flex-1 min-w-[200px]">
                <div className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-border bg-card p-4 cursor-pointer">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-secondary text-secondary-foreground mb-3">
                    <FileText className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-center">View All Jobs</span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Your latest job postings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : recentJobs.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">No jobs yet</p>
                <Link href="/jobs/new">
                  <Button variant="outline" size="sm">
                    Create your first job
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {recentJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-1 truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(job.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {job.blueprint ? (
                          <span className="text-xs font-medium text-green-600 whitespace-nowrap">Ready</span>
                        ) : (
                          <span className="text-xs font-medium text-yellow-600 whitespace-nowrap">Processing</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                {totalJobs > 3 && (
                  <div className="pt-4">
                    <Link href="/jobs">
                      <Button variant="ghost" className="w-full" size="sm">
                        View all jobs
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

