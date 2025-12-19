'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { apiRequest, API_URL } from '@/lib/api'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CandidateChatProps {
  candidateId: string
  candidateName?: string | null
  height?: number
}

async function getSuggestedQuestions(candidateId: string): Promise<string[]> {
  return apiRequest<{ questions: string[] }>(`/api/candidates/${candidateId}/chat/suggestions`).then(
    (res) => res.questions
  )
}

async function streamChatMessage(
  candidateId: string,
  question: string,
  conversationHistory: ChatMessage[],
  onDelta: (delta: string) => void
): Promise<void> {
  const res = await fetch(`${API_URL}/api/candidates/${candidateId}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, conversation_history: conversationHistory }),
  })
  if (!res.ok) {
    throw new Error(await res.text())
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No stream reader available')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames separated by double newline
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      const lines = part.split('\n')
      const dataLine = lines.find((l) => l.startsWith('data: '))
      const eventLine = lines.find((l) => l.startsWith('event: '))
      const eventName = eventLine ? eventLine.replace('event: ', '').trim() : 'message'
      if (!dataLine) continue
      const jsonText = dataLine.replace('data: ', '')
      if (eventName === 'done') return
      if (eventName === 'error') {
        throw new Error(jsonText)
      }
      try {
        const payload = JSON.parse(jsonText)
        if (payload?.delta) onDelta(payload.delta)
      } catch {
        // ignore parse errors
      }
    }
  }
}

export function CandidateChat({ candidateId, candidateName, height = 600 }: CandidateChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load suggested questions
    getSuggestedQuestions(candidateId)
      .then(setSuggestedQuestions)
      .catch(console.error)
  }, [candidateId])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setShowSuggestions(false)
    setIsLoading(true)

    try {
      // Add assistant placeholder and stream into it
      const assistantIdx = newMessages.length
      setMessages([...newMessages, { role: 'assistant', content: '' }])

      await streamChatMessage(candidateId, userMessage.content, messages, (delta) => {
        setMessages((prev) => {
          const next = [...prev]
          const current = next[assistantIdx]
          if (!current || current.role !== 'assistant') return prev
          next[assistantIdx] = { ...current, content: (current.content || '') + delta }
          return next
        })
      })
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (question: string) => {
    setInput(question)
    setShowSuggestions(false)
  }

  return (
    <Card className="flex flex-col" style={{ height: `${height}px` }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Ask About {candidateName || 'Candidate'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 && showSuggestions && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Ask questions about this candidate. Answers are based on their CV and the job requirements.
                </p>
                {suggestedQuestions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-muted-foreground">Suggested questions:</p>
                    <div className="space-y-2">
                      {suggestedQuestions.map((q, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="w-full text-left justify-start h-auto py-2 px-3"
                          onClick={() => handleSuggestionClick(q)}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="text-sm leading-relaxed">
                      {msg.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: (props) => (
                              <a {...props} className="underline" target="_blank" rel="noreferrer" />
                            ),
                            ul: (props) => <ul {...props} className="list-disc pl-5 my-2 space-y-1" />,
                            ol: (props) => <ol {...props} className="list-decimal pl-5 my-2 space-y-1" />,
                            h3: (props) => <h3 {...props} className="font-semibold mt-3 mb-1" />,
                            strong: (props) => <strong {...props} className="font-semibold" />,
                            code: (props) => <code {...props} className="px-1 py-0.5 rounded bg-background/60" />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <span className="text-muted-foreground">Thinking…</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask about the candidate..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
