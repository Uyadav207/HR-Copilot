'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { apiRequest } from '@/lib/api'
import { Job } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Plus, CheckCircle2, Clock, ArrowRight, Sparkles } from 'lucide-react'
import { format } from 'date-fns'

async function fetchJobs(): Promise<Job[]> {
  return apiRequest<Job[]>('/api/jobs')
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

export default function JobsPage() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Job Postings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage and track all your job openings
          </p>
        </div>
        <Link href="/jobs/new">
          <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 shadow-lg shadow-purple-500/25">
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        </Link>
      </motion.div>

      {/* Jobs Grid */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="animate-pulse h-full flex flex-col min-h-[200px]">
              <CardHeader className="flex-1">
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      ) : !jobs || jobs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 border-dashed bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl">
                  <Briefcase className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">No jobs yet</h3>
              <p className="text-muted-foreground text-center mb-8 max-w-md">
                Get started by creating your first job posting. Our AI will help you parse and structure it automatically.
              </p>
              <Link href="/jobs/new">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Job
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {jobs.map((job) => (
            <motion.div
              key={job.id}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <Link href={`/jobs/${job.id}`}>
                <Card className="group h-full flex flex-col min-h-[200px] border-2 hover:border-purple-500/50 transition-all duration-300 cursor-pointer overflow-hidden relative">
                  {/* Gradient accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-bl-full" />
                  
                  <CardHeader className="flex-1 min-h-0 relative z-10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                          {job.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5 text-xs">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{format(new Date(job.created_at), 'MMM d, yyyy')}</span>
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto relative z-10">
                    <div className="flex items-center justify-between gap-2">
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
                      {job.blueprint && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{job.blueprint.required_skills?.length || 0} skills</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
