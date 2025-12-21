"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sparkles } from "lucide-react"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const isLandingPage = pathname === "/"

  // If landing page, render without sidebar
  if (isLandingPage) {
    return <>{children}</>
  }

  // For all other pages, render with sidebar
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden bg-background">
        {/* App Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 backdrop-blur-xl px-4">
          <SidebarTrigger className="-ml-1 hover:bg-accent" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 px-2 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold">HR Copilot</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
