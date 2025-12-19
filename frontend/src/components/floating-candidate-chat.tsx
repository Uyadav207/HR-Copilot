"use client"

import { useState } from "react"
import { MessageCircle, X, Minus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CandidateChat } from "@/components/candidate-chat"

export function FloatingCandidateChat({
  candidateId,
  candidateName,
}: {
  candidateId: string
  candidateName?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating launcher */}
      <div className="fixed bottom-5 left-5 z-[9999]">
        <Button
          onClick={() => setOpen((v) => !v)}
          className="shadow-lg rounded-full h-12 w-12 p-0"
          aria-label={open ? "Close chat" : "Open chat"}
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>

      {/* Floating panel (classic chatbot style) */}
      {open && (
        <div className="fixed bottom-20 left-5 z-[9999] w-[380px] max-w-[calc(100vw-40px)]">
          <div className="rounded-2xl border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">Candidate Chat</div>
                <div className="text-xs text-muted-foreground truncate">
                  Ask about {candidateName || "the candidate"} (JD-aware)
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-3">
              <CandidateChat candidateId={candidateId} candidateName={candidateName} height={520} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

