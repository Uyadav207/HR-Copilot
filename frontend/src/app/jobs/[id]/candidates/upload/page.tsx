'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { apiUpload } from '@/lib/api'
import { Candidate } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      // Invalidate candidates query to trigger refetch when we navigate back
      queryClient.invalidateQueries({ queryKey: ['candidates', jobId] })
      // Complete all steps
      setProcessingSteps(prev => prev.map(step => ({ ...step, status: 'completed' as const })))
      setProgress(100)
      // Navigate back to job page after a short delay to show completion
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

  // Simulate progress steps during upload
  useEffect(() => {
    if (mutation.isPending) {
      setProcessingSteps(PROCESSING_STEPS.map(step => ({ ...step, status: 'pending' as const })))
      setCurrentStepIndex(0)
      setProgress(0)

      // Simulate step progression
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

          const newProgress = ((prev + 1) / PROCESSING_STEPS.length) * 90 // Leave 10% for actual completion
          setProgress(newProgress)
          
          return prev + 1
        })
      }, 800) // Move to next step every 800ms

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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Upload CVs</h1>
        <p className="text-muted-foreground">
          Upload candidate CVs in PDF format. Our AI will automatically parse and evaluate them.
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Select PDF Files</CardTitle>
          <CardDescription>
            Drag and drop PDF files or click to browse. You can upload multiple CVs at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
                isDragActive ? 'bg-primary/10' : 'bg-muted'
              }`}>
                <Upload className={`h-8 w-8 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-base font-medium mb-1">
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Selected Files
                </h3>
                <Badge variant="secondary">{files.length} file{files.length !== 1 ? 's' : ''}</Badge>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
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
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(index)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processing Progress */}
          {mutation.isPending && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Processing CVs</h3>
                      <p className="text-xs text-muted-foreground">
                        Our AI is analyzing your uploaded CVs...
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {files.length} file{files.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <Progress value={progress} className="h-2" />

                  <div className="space-y-2 pt-2">
                    {processingSteps.map((step, index) => {
                      const isActive = step.status === 'processing'
                      const isCompleted = step.status === 'completed'
                      const isError = step.status === 'error'
                      const isPending = step.status === 'pending'

                      return (
                        <div
                          key={step.id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg transition-all",
                            isActive && "bg-primary/10 border border-primary/20",
                            isCompleted && "bg-green-50/60 dark:bg-green-950/30",
                            isError && "bg-red-50/60 dark:bg-red-950/30"
                          )}
                        >
                          <div className="flex h-6 w-6 items-center justify-center shrink-0">
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-700 dark:text-green-400" />
                            ) : isError ? (
                              <AlertCircle className="h-5 w-5 text-red-700 dark:text-red-400" />
                            ) : isActive ? (
                              <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            ) : (
                              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-sm transition-colors",
                              isActive && "font-medium text-primary",
                              isCompleted && "text-green-700 dark:text-green-400",
                              isError && "text-red-700 dark:text-red-400",
                              isPending && "text-muted-foreground"
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {mutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {mutation.error instanceof Error ? mutation.error.message : 'Failed to upload CVs. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={files.length === 0 || mutation.isPending}
              size="lg"
              variant="default"
              className="min-w-[160px]"
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
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

