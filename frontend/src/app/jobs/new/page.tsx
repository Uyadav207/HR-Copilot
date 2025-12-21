'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { Job } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, AlertCircle } from 'lucide-react'
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
    <div className="flex flex-col items-center w-full">
      <div className="space-y-8 max-w-3xl w-full">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Create Job</h1>
        </div>

        {/* Form */}
        <Card className="border shadow-none">
          <CardContent className="pt-8 pb-8 px-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3 pb-6 border-b">
                <Label htmlFor="title" className="text-base font-semibold">
                  Job Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Senior Backend Engineer"
                  className="h-12 text-base border"
                  required
                  disabled={mutation.isPending}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-base font-semibold">
                    Job Description
                  </Label>
                  {isAnimating && (
                    <div className="flex items-center gap-2 text-sm text-primary font-medium">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      <span>Updating...</span>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    id="description"
                    value={description}
                    onChange={handleDescriptionChange}
                    onFocus={handleDescriptionFocus}
                    placeholder="Paste or describe the job requirements..."
                    rows={16}
                    className={cn(
                      "resize-none text-sm transition-all border",
                      isAnimating && "ring-2 ring-primary/30"
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
                {!showChat && !showInlineAI && (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="default"
                      size="default"
                      onClick={() => setShowInlineAI(true)}
                      className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate with AI
                    </Button>
                  </div>
                )}
              </div>

              {mutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {mutation.error instanceof Error ? mutation.error.message : 'Failed to create job. Please try again.'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4 pt-4 justify-center">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={mutation.isPending || !title.trim() || !description.trim()}
                  className="min-w-[140px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {mutation.isPending ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Job'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => router.back()}
                  disabled={mutation.isPending}
                  className="min-w-[140px] font-semibold border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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

