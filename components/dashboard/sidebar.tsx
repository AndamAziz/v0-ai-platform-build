"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import {
  LayoutDashboard,
  ImageIcon,
  VideoIcon,
  MicIcon,
  Activity,
  Users,
  Settings,
  Sparkles,
  Menu,
  MessageSquare,
  Globe,
  LayoutGrid,
  Download,
  UserCircle,
  Scissors,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

interface DashboardSidebarProps {
  profile: Profile
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Gallery", href: "/dashboard/gallery", icon: LayoutGrid },
  { name: "Chat Studio", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Website Builder", href: "/dashboard/website", icon: Globe },
  { name: "Image Studio", href: "/dashboard/image", icon: ImageIcon },
  { name: "Portrait Editor", href: "/dashboard/portrait", icon: UserCircle },
  { name: "Video Studio", href: "/dashboard/video", icon: VideoIcon },
  { name: "Video Downloader", href: "/dashboard/video-downloader", icon: Download },
  { name: "Voice Studio", href: "/dashboard/voice", icon: MicIcon },
  { name: "MP3 Editor", href: "/dashboard/mp3-editor", icon: Scissors },
]

const adminNavigation = [
  { name: "User Management", href: "/dashboard/admin/users", icon: Users },
  { name: "Settings", href: "/dashboard/admin/settings", icon: Settings },
  { name: "API Status", href: "/dashboard/status", icon: Activity },
]

export function DashboardSidebar({ profile }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const NavContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <Sparkles className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">AI Studio</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}

        {profile.role === "admin" && (
          <>
            <div className="my-4 border-t border-border" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Admin</p>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </>
        )}
      </nav>
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground">Credits</p>
          <p className="text-2xl font-bold">
            {profile.role === "admin" ? "Unlimited" : profile.credits.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="fixed left-4 top-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card md:block">
        <NavContent />
      </aside>
    </>
  )
}
