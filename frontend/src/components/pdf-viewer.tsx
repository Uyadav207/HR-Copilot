'use client'

import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface PDFViewerProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string
  filename: string
}

export function PDFViewer({ isOpen, onClose, pdfUrl, filename }: PDFViewerProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !pdfUrl) return

    let objectUrl: string | null = null

    const fetchPDF = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Get token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        if (!token) {
          throw new Error('Not authenticated')
        }

        // Fetch PDF with auth header
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const fullUrl = pdfUrl.startsWith('http') ? pdfUrl : `${apiUrl}${pdfUrl}`
        
        const response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load PDF')
        }

        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        setPdfBlobUrl(objectUrl)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
        console.error('Error loading PDF:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPDF()

    // Cleanup: revoke object URL when component unmounts or PDF URL changes
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [isOpen, pdfUrl])

  // Cleanup blob URL when viewer closes
  useEffect(() => {
    if (!isOpen && pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl)
      setPdfBlobUrl(null)
    }
  }, [isOpen, pdfBlobUrl])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-50",
        "w-full sm:w-3/4 md:w-2/3 lg:w-1/2 xl:w-2/5",
        "bg-background border-l shadow-2xl",
        "transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{filename}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 shrink-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close PDF viewer</span>
        </Button>
      </div>

      {/* PDF Content */}
      <div className="h-[calc(100vh-3.5rem)] overflow-hidden relative bg-muted/50">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6">
              <p className="text-sm text-destructive mb-2">Failed to load PDF</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        )}
        {pdfBlobUrl && !loading && !error && (
          <iframe
            src={pdfBlobUrl}
            className="w-full h-full border-0"
            title={filename}
          />
        )}
      </div>
    </div>
  )
}
