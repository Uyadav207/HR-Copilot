'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { Job } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, FileText, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FloatingChat } from '@/components/floating-chat'
import { InlineAIBar } from '@/components/inline-ai-bar'
import { cn } from '@/lib/utils'

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
    const clearInterval = setInterval(() => {
      step++
      if (step <= clearSteps) {
        const progress = step / clearSteps
        const remainingChars = Math.floor(currentText.length * (1 - progress))
        setDescription(currentText.substring(0, remainingChars))
      } else {
        clearInterval(clearInterval)
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

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
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
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create New Job</h1>
        <p className="text-muted-foreground">
          Use AI to generate your job description or paste it manually. Our AI will automatically parse and structure it for you.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI-Powered Job Creation</CardTitle>
          </div>
          <CardDescription>
            Use the chat assistant to generate your job description in natural language, or paste an existing JD. Our AI will automatically extract skills, requirements, and create an evaluation blueprint.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        {/* Form Card */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>
                Provide the job title and description. Use the AI assistant on the left to generate it, or paste from any job board or document.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base">
                    Job Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Senior Backend Engineer"
                    className="h-11"
                    required
                    disabled={mutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the exact job title as it appears in your job posting
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description" className="text-base">
                      Job Description <span className="text-destructive">*</span>
                    </Label>
                    {isAnimating && (
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        <span>Updating...</span>
                      </div>
                    )}
                  </div>
                  <div className="relative space-y-2">
                    <Textarea
                      ref={textareaRef}
                      id="description"
                      value={description}
                      onChange={handleDescriptionChange}
                      onFocus={handleDescriptionFocus}
                      placeholder="Use the AI assistant to generate a job description, or paste the full job description here. Include requirements, responsibilities, qualifications, and any other relevant details..."
                      rows={18}
                      className={cn(
                        "resize-none font-mono text-sm transition-all duration-200",
                        isAnimating && "ring-2 ring-primary/20"
                      )}
                      required
                      disabled={mutation.isPending}
                    />
                    <InlineAIBar
                      jobTitle={title}
                      onGenerate={handleInlineGenerate}
                      isVisible={showInlineAI}
                      onClose={() => setShowInlineAI(false)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {!showChat && !showInlineAI && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowChat(true)}
                            className="gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            Generate using AI
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowInlineAI(true)}
                            className="gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            Ask AI
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        The more detailed the description, the better our AI can create an accurate evaluation blueprint
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {description.length} characters
                    </p>
                  </div>
                </div>

                {mutation.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {mutation.error instanceof Error ? mutation.error.message : 'Failed to create job. Please try again.'}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4 pt-4">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={mutation.isPending || !title.trim() || !description.trim()}
                    className="min-w-[140px]"
                  >
                    {mutation.isPending ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
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
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

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

