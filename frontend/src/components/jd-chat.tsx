'use client'

import * as React from 'react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Send, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface JDChatProps {
  jobTitle?: string
  onApprove: (jd: string) => void
  onClose: () => void
  className?: string
}

async function generateJD(
  message: string,
  conversationHistory: Message[],
  jobTitle?: string
): Promise<{ job_description: string }> {
  return apiRequest<{ job_description: string }>('/api/jobs/generate-description', {
    method: 'POST',
    body: JSON.stringify({
      message,
      conversation_history: conversationHistory,
      job_title: jobTitle,
    }),
  })
}

export function JDChat({ jobTitle, onApprove, onClose, className }: JDChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [latestJD, setLatestJD] = useState<string | null>(null)
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)

  const mutation = useMutation({
    mutationFn: (message: string) =>
      generateJD(message, messages, jobTitle),
    onSuccess: (data) => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.job_description,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setLatestJD(data.job_description)
      setInput('')
      // Scroll to bottom after message is added
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight
          }
        }
      }, 100)
    },
    onError: (error) => {
      // Add error message to chat
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Failed to generate job description'}. Please try again.`,
      }
      setMessages((prev) => [...prev, errorMessage])
    },
  })

  // Auto-scroll when messages change
  React.useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      setTimeout(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }, 100)
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || mutation.isPending) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    }
    setMessages((prev) => [...prev, userMessage])
    mutation.mutate(input.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleApprove = () => {
    if (latestJD) {
      onApprove(latestJD)
    }
  }

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">AI Job Description Assistant</CardTitle>
              <CardDescription className="text-xs">
                Describe what you need and I'll create the JD
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium mb-1">Start by describing the job you want to create.</p>
                <p className="text-xs mt-2">
                  Example: "I need a Senior Backend Engineer with 5+ years of experience in Node.js and TypeScript"
                </p>
                <p className="text-xs mt-1 opacity-75">
                  You can continue chatting to refine the job description
                </p>
              </div>
            ) : (
              messages.map((message, idx) => (
                <div key={idx} className="space-y-3">
                  <div
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-lg px-4 py-2.5 text-sm',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted border'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">AI Assistant</span>
                        </div>
                      )}
                      <div className={cn(
                        "whitespace-pre-wrap leading-relaxed",
                        message.role === 'assistant' && "max-h-[400px] overflow-y-auto pr-2"
                      )}>
                        <p>{message.content}</p>
                      </div>
                    </div>
                  </div>
                  {/* Show Approve button only for the latest assistant message */}
                  {message.role === 'assistant' && idx === messages.length - 1 && latestJD && (
                    <div className="flex justify-start px-1">
                      <Button
                        size="sm"
                        onClick={handleApprove}
                        className="gap-2"
                      >
                        <Sparkles className="h-3 w-3" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
            {mutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the job requirements..."
              className="flex-1 min-h-[60px] max-h-[120px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={mutation.isPending}
              rows={2}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || mutation.isPending}
              className="shrink-0"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
