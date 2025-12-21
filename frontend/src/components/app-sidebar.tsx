"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Settings,
  Users,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    gradient: "from-purple-500 to-pink-500",
    activeBg: "bg-purple-500"
  },
  {
    name: "Jobs",
    href: "/jobs",
    icon: Briefcase,
    gradient: "from-blue-500 to-cyan-500",
    activeBg: "bg-blue-500"
  },
  {
    name: "Create Job",
    href: "/jobs/new",
    icon: PlusCircle,
    gradient: "from-green-500 to-emerald-500",
    activeBg: "bg-green-500"
  },
  {
    name: "Candidates",
    href: "/candidates",
    icon: Users,
    gradient: "from-amber-500 to-orange-500",
    activeBg: "bg-amber-500"
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    gradient: "from-slate-500 to-zinc-500",
    activeBg: "bg-slate-500"
  },
]

function SidebarHeaderContent() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <div className={cn(
      "flex items-center gap-3 py-4",
      isCollapsed ? "justify-center px-2" : "px-2"
    )}>
      <div className={cn(
        "flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shrink-0 shadow-lg shadow-purple-500/30",
        isCollapsed ? "h-10 w-10" : "h-10 w-10"
      )}>
        <Sparkles className="h-5 w-5" />
      </div>
      {!isCollapsed && (
        <div className="flex flex-col min-w-0">
          <span className="text-base font-bold tracking-tight truncate">HR Copilot</span>
          <span className="text-xs text-muted-foreground truncate">AI-Powered Hiring</span>
        </div>
      )}
    </div>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const { user } = useAuth()
  const isCollapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar-background/50 backdrop-blur-xl">
        <SidebarHeaderContent />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                // Check if there's a more specific route that matches exactly
                const hasExactMatch = navigation.some(otherItem => 
                  otherItem.href !== item.href && 
                  pathname === otherItem.href
                )
                
                // Exact match - highest priority
                const isExactMatch = pathname === item.href
                
                // For parent routes, only match if it's a child route (not a sibling route)
                // e.g., /jobs should match /jobs/123 but not /jobs/new
                const isParentRoute = !hasExactMatch && 
                  item.href !== "/" && 
                  pathname?.startsWith(item.href + "/")
                
                const isActive = isExactMatch || isParentRoute
                
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={isCollapsed ? item.name : undefined}
                      size="default"
                      className={cn(
                        "relative group",
                        "hover:bg-transparent",
                        isActive && "!bg-transparent !font-normal"
                      )}
                    >
                      <Link href={item.href}>
                        <div className={cn(
                          "flex items-center gap-3 w-full",
                          isCollapsed && "justify-center"
                        )}>
                          <div className={cn(
                            "flex items-center justify-center shrink-0 rounded-lg transition-all h-9 w-9",
                            isActive 
                              ? `${item.activeBg} text-white`
                              : "text-muted-foreground group-hover:text-foreground"
                          )}>
                            <item.icon className={cn(
                              "h-5 w-5 transition-colors",
                              isActive && "text-white"
                            )} />
                          </div>
                          {!isCollapsed && (
                            <span className={cn(
                              "text-sm font-medium transition-colors",
                              "text-sidebar-foreground"
                            )}>
                              {item.name}
                            </span>
                          )}
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!isCollapsed && user && (
        <SidebarFooter className="border-t border-sidebar-border bg-sidebar-background/50 backdrop-blur-xl p-2">
          <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
            {user.email}
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
