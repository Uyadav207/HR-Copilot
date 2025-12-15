'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface InlineAIBarProps {
  jobTitle?: string
  onGenerate: (text: string) => void
  isVisible: boolean
  onClose: () => void
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

export function InlineAIBar({ jobTitle, onGenerate, isVisible, onClose }: InlineAIBarProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)

  const mutation = useMutation({
    mutationFn: (message: string) => {
      setIsThinking(true)
      return generateJD(message, messages, jobTitle)
    },
    onSuccess: (data) => {
      setIsThinking(false)
      // Use typewriter effect to insert the generated text
      onGenerate(data.job_description)
      // Add to conversation history
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.job_description,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setInput('')
    },
    onError: (error) => {
      setIsThinking(false)
      console.error('Failed to generate:', error)
    },
  })

  // Reset when closed
  useEffect(() => {
    if (!isVisible) {
      setInput('')
      setMessages([])
      setIsThinking(false)
    }
  }, [isVisible])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || mutation.isPending || isThinking) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsThinking(true)
    mutation.mutate(input.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isVisible) return null

  return (
    <div className="mt-2 p-3 border rounded-lg bg-muted/50 backdrop-blur-sm animate-in slide-in-from-top-2 fade-in-0 duration-200">
      <div className="flex items-start gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 shrink-0 mt-1">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">AI Assistant</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          {(isThinking || mutation.isPending) && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="animate-pulse">Thinking...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI to generate or improve the job description..."
              className="flex-1 min-h-[40px] max-h-[100px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={mutation.isPending || isThinking}
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || mutation.isPending || isThinking}
              className="shrink-0 h-9 w-9"
            >
              {mutation.isPending || isThinking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

