'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Eye, Code, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface MDXEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  disabled?: boolean
  required?: boolean
}

export function MDXEditor({ 
  value, 
  onChange, 
  placeholder, 
  rows = 18, 
  className,
  disabled,
  required
}: MDXEditorProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit')

  return (
    <div className={cn("relative border-2 rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground">MDX Editor</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setViewMode('edit')}
          >
            <Code className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setViewMode('preview')}
          >
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </Button>
          <Button
            type="button"
            variant={viewMode === 'split' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setViewMode('split')}
          >
            <Check className="h-3 w-3 mr-1" />
            Split
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {viewMode === 'edit' && (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={cn(
              "resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none",
              "font-mono text-sm"
            )}
            disabled={disabled}
            required={required}
          />
        )}

        {viewMode === 'preview' && (
          <div className="p-4 min-h-[200px] overflow-y-auto">
            {value ? (
              <div className="markdown-content">
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-3 mt-5" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-4" {...props} />,
                    p: ({node, ...props}) => <p className="mb-3 text-foreground" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1 ml-4" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-4" {...props} />,
                    li: ({node, ...props}) => <li className="text-foreground" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                    em: ({node, ...props}) => <em className="italic" {...props} />,
                    code: ({node, ...props}) => <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-muted-foreground pl-4 italic my-3" {...props} />,
                  }}
                >
                  {value}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-muted-foreground italic">No content to preview</p>
            )}
          </div>
        )}

        {viewMode === 'split' && (
          <div className="grid grid-cols-2 divide-x">
            <div className="relative">
              <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className={cn(
                  "resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none",
                  "font-mono text-sm"
                )}
                disabled={disabled}
                required={required}
              />
            </div>
            <div className="p-4 min-h-[200px] overflow-y-auto">
              {value ? (
                <div className="markdown-content">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-3 mt-5" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-4" {...props} />,
                      p: ({node, ...props}) => <p className="mb-3 text-foreground" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1 ml-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-4" {...props} />,
                      li: ({node, ...props}) => <li className="text-foreground" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                      em: ({node, ...props}) => <em className="italic" {...props} />,
                      code: ({node, ...props}) => <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-muted-foreground pl-4 italic my-3" {...props} />,
                    }}
                  >
                    {value}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No content to preview</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

