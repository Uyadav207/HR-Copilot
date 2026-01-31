'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
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
  onTitleUpdate?: (title: string) => void
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

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function* generateJDStream(
  message: string,
  conversationHistory: Message[],
  jobTitle?: string
): AsyncGenerator<{ type: 'title' | 'description'; content: string }, void, unknown> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const response = await fetch(`${API_URL}/api/jobs/generate-description`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      message,
      conversation_history: conversationHistory,
      job_title: jobTitle,
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || error.details || error.detail || error.message || `HTTP error! status: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk = JSON.parse(line)
            if (chunk.type && chunk.content) {
              yield chunk
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer)
        if (chunk.type && chunk.content) {
          yield chunk
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function InlineAIBar({ jobTitle, onGenerate, onTitleUpdate, isVisible, onClose }: InlineAIBarProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  const handleStreaming = async (message: string) => {
    setIsStreaming(true)

    try {
      let finalTitle = ''
      let finalDescription = ''

      for await (const chunk of generateJDStream(message, messages, jobTitle)) {
        if (chunk.type === 'title') {
          finalTitle = chunk.content
          if (onTitleUpdate) {
            onTitleUpdate(chunk.content)
          }
        } else if (chunk.type === 'description') {
          finalDescription = chunk.content
          // Stream the description as it comes
          onGenerate(chunk.content)
        }
      }

      // Final update with complete content
      if (finalDescription) {
        onGenerate(finalDescription)
      }
      if (finalTitle && onTitleUpdate) {
        onTitleUpdate(finalTitle)
      }

      // Add to conversation history
      const assistantMessage: Message = {
        role: 'assistant',
        content: finalDescription || 'Generated job description',
      }
      setMessages((prev) => [...prev, assistantMessage])
      setInput('')
    } catch (error) {
      console.error('Failed to generate:', error)
      // Fallback to non-streaming
      try {
        const data = await generateJD(message, messages, jobTitle)
        onGenerate(data.job_description)
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.job_description,
        }
        setMessages((prev) => [...prev, assistantMessage])
        setInput('')
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
      }
    } finally {
      setIsStreaming(false)
    }
  }

  // Reset when closed
  useEffect(() => {
    if (!isVisible) {
      setInput('')
      setMessages([])
      setIsStreaming(false)
    }
  }, [isVisible])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    }
    setMessages((prev) => [...prev, userMessage])
    const messageText = input.trim()
    setInput('')
    await handleStreaming(messageText)
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
          
          {isStreaming && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="animate-pulse">Generating...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI to generate or improve the job description..."
              className="flex-1 min-h-[40px] max-h-[100px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isStreaming}
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isStreaming}
              className="shrink-0 h-9 w-9"
            >
              {isStreaming ? (
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

