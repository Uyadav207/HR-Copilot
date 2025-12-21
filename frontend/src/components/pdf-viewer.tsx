'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PDFViewerProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string
  filename: string
}

export function PDFViewer({ isOpen, onClose, pdfUrl, filename }: PDFViewerProps) {
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
        <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={filename}
          />
        </div>
    </div>
  )
}
