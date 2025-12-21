'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, Users, FileText, Sparkles, Clock, Plus, ArrowRight, TrendingUp, Zap, CheckCircle2 } from 'lucide-react'
import { apiRequest } from '@/lib/api'
import { Job } from '@/types'
import { format } from 'date-fns'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { Candidate } from '@/types'

async function fetchJobs(): Promise<Job[]> {
  return apiRequest<Job[]>('/api/jobs')
}

async function fetchAllCandidates(): Promise<Candidate[]> {
  return apiRequest<Candidate[]>('/api/candidates')
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
  }
}

export default function DashboardPage() {
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  })

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['allCandidates'],
    queryFn: fetchAllCandidates,
  })

  const recentJobs = jobs?.slice(0, 3) || []
  const totalJobs = jobs?.length || 0
  const totalCandidates = candidates?.length || 0
  const totalEvaluations = candidates?.filter(c => c.evaluation !== null).length || 0

  const stats = [
    {
      title: 'Total Jobs',
      value: totalJobs,
      icon: Briefcase,
      gradient: 'from-purple-500 to-pink-500',
      description: 'Active job postings',
      change: '+12%',
      changePositive: true
    },
    {
      title: 'Candidates',
      value: totalCandidates,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
      description: 'Total candidates',
      change: '+28%',
      changePositive: true,
      loading: candidatesLoading
    },
    {
      title: 'Evaluations',
      value: totalEvaluations,
      icon: FileText,
      gradient: 'from-green-500 to-emerald-500',
      description: 'AI assessments',
      change: '+45%',
      changePositive: true,
      loading: candidatesLoading
    },
    {
      title: 'AI Insights',
      value: 'Active',
      icon: Sparkles,
      gradient: 'from-amber-500 to-orange-500',
      description: 'Powered by GPT-4',
      change: 'Live',
      changePositive: true,
      isString: true
    }
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <div className="absolute -top-6 -left-6 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="relative">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
            Welcome back
          </h1>
          <p className="text-lg text-muted-foreground">
            Here's what's happening with your hiring pipeline today
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.02 }}
              className="group relative"
            >
              {/* Glow effect on hover */}
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${stat.gradient} rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity`} />
              
              <Card className="relative h-full border-2 hover:border-purple-500/30 transition-all duration-300 overflow-hidden">
                {/* Gradient accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-5 rounded-bl-full`} />
                
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold">
                      {stat.loading ? (
                        <span className="text-muted-foreground">-</span>
                      ) : stat.isString ? (
                        <span>{stat.value}</span>
                      ) : (
                        <AnimatedCounter value={stat.value as number} />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                      {stat.change && (
                        <span className={`text-xs font-semibold ${
                          stat.changePositive 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stat.change}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Quick Actions & Recent Jobs */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="h-full border-2 hover:border-purple-500/30 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Quick Actions
              </CardTitle>
              <CardDescription>Get started with common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/jobs/new" className="group">
                  <div className="relative h-full p-6 rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5 hover:border-primary/50 hover:from-purple-500/10 hover:to-pink-500/10 transition-all cursor-pointer">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                        <Plus className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold mb-1">Create New Job</div>
                        <div className="text-xs text-muted-foreground">Post a new opening</div>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/jobs" className="group">
                  <div className="relative h-full p-6 rounded-xl border-2 border-dashed border-border bg-card hover:border-purple-500/30 hover:bg-accent/50 transition-all cursor-pointer">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                        <Briefcase className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold mb-1">View All Jobs</div>
                        <div className="text-xs text-muted-foreground">Manage postings</div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Jobs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="h-full border-2 hover:border-purple-500/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Recent Jobs
                </CardTitle>
                <CardDescription>Your latest job postings</CardDescription>
              </div>
              {totalJobs > 3 && (
                <Link href="/jobs">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Briefcase className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">No jobs yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first job posting to get started
                  </p>
                  <Link href="/jobs/new">
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Job
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentJobs.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    >
                      <Link href={`/jobs/${job.id}`}>
                        <div className="group relative p-4 rounded-xl border-2 border-border hover:border-purple-500/50 hover:bg-accent/50 transition-all cursor-pointer">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                                {job.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{format(new Date(job.created_at), 'MMM d, yyyy')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {job.blueprint ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">Ready</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">Processing</span>
                                </div>
                              )}
                              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Insights Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card className="border-2 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-purple-500/5 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              AI Insights
            </CardTitle>
            <CardDescription>Your hiring metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-xl bg-card/50 border border-border">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                  {totalEvaluations > 0 ? Math.round((totalEvaluations / totalCandidates) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Evaluation Rate</div>
              </div>
              <div className="p-4 rounded-xl bg-card/50 border border-border">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {totalCandidates > 0 ? Math.round(totalCandidates / (totalJobs || 1)) : 0}
                </div>
                <div className="text-sm text-muted-foreground">Avg. Candidates per Job</div>
              </div>
              <div className="p-4 rounded-xl bg-card/50 border border-border">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {totalJobs > 0 ? 'Active' : 'Setup'}
                </div>
                <div className="text-sm text-muted-foreground">Pipeline Status</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
