'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { apiRequest } from '@/lib/api'
import { Job } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, AlertCircle, Plus, ArrowLeft, Edit2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FloatingChat } from '@/components/floating-chat'
import { InlineAIBar } from '@/components/inline-ai-bar'
import { MDXEditor } from '@/components/mdx-editor'
import { cn } from '@/lib/utils'
import Link from 'next/link'

async function createJob(data: { title: string; raw_description: string }): Promise<Job> {
  return apiRequest<Job>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Animated text update function using typewriter effect
function animateTextUpdate(
  setDescription: (text: string) => void,
  setIsAnimating: (animating: boolean) => void,
  newText: string,
  currentText: string
) {
  if (newText === currentText) return

  setIsAnimating(true)
  const duration = 800 // Animation duration in ms
  const steps = 40
  const stepDuration = duration / steps
  
  // Calculate character difference
  const isReplacing = newText !== currentText && currentText.length > 0
  
  if (isReplacing) {
    // For replacements, do a smooth fade transition
    // First, clear the text quickly
    let step = 0
    const clearSteps = 10
    const clearIntervalId = setInterval(() => {
      step++
      if (step <= clearSteps) {
        const progress = step / clearSteps
        const remainingChars = Math.floor(currentText.length * (1 - progress))
        setDescription(currentText.substring(0, remainingChars))
      } else {
        clearInterval(clearIntervalId)
        // Then type the new text
        typeText(newText, setDescription, setIsAnimating, stepDuration)
      }
    }, stepDuration)
  } else {
    // For new text, just type it out
    typeText(newText, setDescription, setIsAnimating, stepDuration)
  }
}

function typeText(
  text: string,
  setDescription: (text: string) => void,
  setIsAnimating: (animating: boolean) => void,
  stepDuration: number
) {
  let currentIndex = 0
  const charsPerStep = Math.max(1, Math.ceil(text.length / 40))
  
  const typingInterval = setInterval(() => {
    if (currentIndex < text.length) {
      currentIndex += charsPerStep
      const displayText = text.substring(0, Math.min(currentIndex, text.length))
      setDescription(displayText)
    } else {
      setDescription(text)
      setIsAnimating(false)
      clearInterval(typingInterval)
    }
  }, stepDuration)
}

export default function NewJobPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showInlineAI, setShowInlineAI] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previousDescriptionRef = useRef<string>('')

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: (data) => {
      router.push(`/jobs/${data.id}`)
    },
  })

  const handleJDApprove = (jd: string) => {
    const currentText = previousDescriptionRef.current || description
    previousDescriptionRef.current = jd
    animateTextUpdate(setDescription, setIsAnimating, jd, currentText)
    // Close chat after approval
    setShowChat(false)
  }

  const handleInlineGenerate = (generatedText: string) => {
    const currentText = previousDescriptionRef.current || description
    previousDescriptionRef.current = generatedText
    animateTextUpdate(setDescription, setIsAnimating, generatedText, currentText)
    // Keep inline AI open for further edits
  }

  const handleTitleUpdate = (newTitle: string) => {
    if (newTitle && newTitle.trim()) {
      setTitle(newTitle.trim())
    }
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement> | string) => {
    const newValue = typeof e === 'string' ? e : e.target.value
    setDescription(newValue)
    previousDescriptionRef.current = newValue
    setIsAnimating(false)
    
    // Show inline AI when user starts typing
    if (newValue.length > 0 && !showInlineAI) {
      setShowInlineAI(true)
    }
  }

  const handleDescriptionFocus = () => {
    // Show inline AI when textarea is focused and has content
    if (description.length > 0 && !showInlineAI) {
      setShowInlineAI(true)
    }
  }

  const handleChatClose = () => {
    setShowChat(false)
  }

  useEffect(() => {
    previousDescriptionRef.current = description
  }, [description])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      return
    }
    mutation.mutate({ title, raw_description: description })
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="space-y-8 max-w-4xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="gap-2 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Jobs
            </Button>
          </Link>
          
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="relative text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border border-purple-200/50 dark:border-purple-700/50 mb-4">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  AI-Powered Job Creation
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Create New Job
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Our AI will automatically parse and structure your job description
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-2 hover:border-purple-500/30 transition-all overflow-hidden relative">
            {/* Gradient accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-bl-full" />
            
            <CardContent className="pt-8 pb-8 px-6 md:px-8 relative z-10">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3 pb-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="title" className="text-base font-semibold flex items-center gap-2">
                      <span>Job Title</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    {title && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newTitle = prompt('Edit job title:', title)
                          if (newTitle !== null) {
                            setTitle(newTitle)
                          }
                        }}
                        className="h-7 text-xs"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Senior Backend Engineer or describe the role you need (AI will generate appropriate title)"
                    className="h-12 text-base border-2 focus:border-purple-500/50 transition-colors"
                    required
                    disabled={mutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a specific job title or describe the role. AI will generate an appropriate title based on your description.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description" className="text-base font-semibold flex items-center gap-2">
                      <span>Job Description</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    {isAnimating && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 font-medium"
                      >
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        <span>AI is updating...</span>
                      </motion.div>
                    )}
                  </div>
                  <div className="relative">
                    <MDXEditor
                      value={description}
                      onChange={(value) => handleDescriptionChange(value)}
                      placeholder="Paste or describe the job requirements, responsibilities, and qualifications. You can also use AI to generate a complete job description in MDX format..."
                      rows={18}
                      className={cn(
                        "transition-all",
                        isAnimating && "ring-2 ring-purple-500/30"
                      )}
                      required
                      disabled={mutation.isPending}
                    />
                    <div className="mt-2">
                      <InlineAIBar
                        jobTitle={title}
                        onGenerate={handleInlineGenerate}
                        onTitleUpdate={handleTitleUpdate}
                        isVisible={showInlineAI}
                        onClose={() => setShowInlineAI(false)}
                      />
                    </div>
                  </div>
                  {!showChat && !showInlineAI && (
                    <div className="flex justify-center pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        onClick={() => setShowInlineAI(true)}
                        className="gap-2 border-2 border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-950/20 font-semibold"
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate with AI
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Paste any job description or use AI to generate one in MDX format. You can edit the MDX directly, preview it, or use split view. Our system will automatically extract requirements and create a blueprint.
                  </p>
                </div>

                {mutation.isError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Alert variant="destructive" className="border-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {mutation.error instanceof Error ? mutation.error.message : 'Failed to create job. Please try again.'}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                <div className="flex gap-4 pt-4 justify-center">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={mutation.isPending || !title.trim() || !description.trim()}
                    className="min-w-[160px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 shadow-lg shadow-purple-500/25 font-semibold"
                  >
                    {mutation.isPending ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Job
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => router.back()}
                    disabled={mutation.isPending}
                    className="min-w-[140px] font-semibold border-2 hover:bg-accent/50"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Floating Chat */}
        <FloatingChat
          jobTitle={title}
          onApprove={handleJDApprove}
          onClose={handleChatClose}
          isOpen={showChat}
        />
      </div>
    </div>
  )
}
