'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { apiUpload } from '@/lib/api'
import { Candidate } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2, Sparkles, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

async function uploadCandidates(jobId: string, files: File[]): Promise<Candidate[]> {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })
  return apiUpload<Candidate[]>(`/api/jobs/${jobId}/candidates`, formData)
}

type ProcessingStep = {
  id: string
  label: string
  status: 'pending' | 'processing' | 'completed' | 'error'
}

const PROCESSING_STEPS: ProcessingStep[] = [
  { id: 'upload', label: 'Uploading files...', status: 'pending' },
  { id: 'extract', label: 'Extracting text from PDF...', status: 'pending' },
  { id: 'parse', label: 'Parsing CV structure...', status: 'pending' },
  { id: 'skills', label: 'Reading key skills...', status: 'pending' },
  { id: 'experience', label: 'Extracting experience...', status: 'pending' },
  { id: 'education', label: 'Analyzing education...', status: 'pending' },
  { id: 'profile', label: 'Creating candidate profile...', status: 'pending' },
  { id: 'complete', label: 'Complete!', status: 'pending' },
]

export default function UploadCandidatesPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const [files, setFiles] = useState<File[]>([])
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>(PROCESSING_STEPS)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (files: File[]) => uploadCandidates(jobId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', jobId] })
      setProcessingSteps(prev => prev.map(step => ({ ...step, status: 'completed' as const })))
      setProgress(100)
      setTimeout(() => {
        router.replace(`/jobs/${jobId}`)
      }, 1500)
    },
    onError: () => {
      setProcessingSteps(prev => prev.map(step => 
        step.status === 'processing' ? { ...step, status: 'error' as const } : step
      ))
    },
  })

  useEffect(() => {
    if (mutation.isPending) {
      setProcessingSteps(PROCESSING_STEPS.map(step => ({ ...step, status: 'pending' as const })))
      setCurrentStepIndex(0)
      setProgress(0)

      const stepInterval = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= PROCESSING_STEPS.length - 1) {
            clearInterval(stepInterval)
            return prev
          }
          
          setProcessingSteps(current => {
            const updated = [...current]
            if (updated[prev]) {
              updated[prev] = { ...updated[prev], status: 'completed' }
            }
            if (updated[prev + 1]) {
              updated[prev + 1] = { ...updated[prev + 1], status: 'processing' }
            }
            return updated
          })

          const newProgress = ((prev + 1) / PROCESSING_STEPS.length) * 90
          setProgress(newProgress)
          
          return prev + 1
        })
      }, 800)

      return () => clearInterval(stepInterval)
    }
  }, [mutation.isPending])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    onDrop: (acceptedFiles) => {
      setFiles((prev) => [...prev, ...acceptedFiles])
    },
  })

  const handleSubmit = () => {
    if (files.length === 0) {
      return
    }
    mutation.mutate(files)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <Link href={`/jobs/${jobId}`}>
          <Button variant="ghost" size="sm" className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Job
          </Button>
        </Link>
        
        <div className="relative">
          <div className="absolute -top-6 -left-6 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="relative space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 border border-blue-200/50 dark:border-blue-700/50 mb-4">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                AI-Powered CV Processing
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Upload CVs</h1>
            <p className="text-lg text-muted-foreground">
              Upload candidate CVs in PDF format. Our AI will automatically parse and evaluate them.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Upload Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card className="border-2 hover:border-purple-500/30 transition-all overflow-hidden relative">
          {/* Gradient accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-bl-full" />
          
          <CardHeader className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Select PDF Files</CardTitle>
                <CardDescription>
                  Drag and drop PDF files or click to browse. You can upload multiple CVs at once.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all relative overflow-hidden",
                isDragActive
                  ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 scale-[1.02] shadow-lg shadow-purple-500/10'
                  : 'border-muted-foreground/25 hover:border-purple-500/50 hover:bg-accent/50'
              )}
            >
              {isDragActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 animate-pulse" />
              )}
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4 relative z-10">
                <motion.div
                  animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                  className={cn(
                    "flex h-20 w-20 items-center justify-center rounded-full transition-all",
                    isDragActive ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-xl' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                  )}
                >
                  <Upload className="h-10 w-10 text-white" />
                </motion.div>
                <div>
                  <p className="text-lg font-semibold mb-1">
                    {isDragActive
                      ? 'Drop the files here...'
                      : 'Drag & drop PDF files here'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse from your computer
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  PDF files only • Max file size: 10MB
                </p>
              </div>
            </div>

            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Selected Files
                  </h3>
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                    {files.length} file{files.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {files.map((file, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border-2 border-border hover:border-purple-500/30 hover:bg-accent/50 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center border border-blue-500/20">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:border-destructive/50"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Processing Progress */}
            {mutation.isPending && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                          <Sparkles className="h-6 w-6 text-white animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Processing CVs</h3>
                          <p className="text-xs text-muted-foreground">
                            Our AI is analyzing your uploaded CVs...
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                          {files.length} file{files.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      <Progress value={progress} className="h-3" />

                      <div className="space-y-2 pt-2">
                        {processingSteps.map((step, index) => {
                          const isActive = step.status === 'processing'
                          const isCompleted = step.status === 'completed'
                          const isError = step.status === 'error'
                          const isPending = step.status === 'pending'

                          return (
                            <motion.div
                              key={step.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg transition-all border",
                                isActive && "bg-purple-500/10 border-purple-500/30 shadow-md",
                                isCompleted && "bg-green-500/10 border-green-500/30",
                                isError && "bg-red-500/10 border-red-500/30",
                                isPending && "border-border bg-card"
                              )}
                            >
                              <div className="flex h-7 w-7 items-center justify-center shrink-0">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                ) : isError ? (
                                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                ) : isActive ? (
                                  <Loader2 className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-spin" />
                                ) : (
                                  <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                                )}
                              </div>
                              <span
                                className={cn(
                                  "text-sm transition-colors",
                                  isActive && "font-semibold text-purple-600 dark:text-purple-400",
                                  isCompleted && "text-green-600 dark:text-green-400",
                                  isError && "text-red-600 dark:text-red-400",
                                  isPending && "text-muted-foreground"
                                )}
                              >
                                {step.label}
                              </span>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {mutation.isError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert variant="destructive" className="border-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {mutation.error instanceof Error ? mutation.error.message : 'Failed to upload CVs. Please try again.'}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={files.length === 0 || mutation.isPending}
                size="lg"
                className="min-w-[160px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 shadow-lg shadow-purple-500/25"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {files.length} CV{files.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.back()}
                disabled={mutation.isPending}
                className="border-2"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
