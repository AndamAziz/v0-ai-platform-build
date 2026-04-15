"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User, ChevronDown, Pencil } from "lucide-react"
import type { Profile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface DashboardHeaderProps {
  profile: Profile
}

export function DashboardHeader({ profile }: DashboardHeaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [newName, setNewName] = useState(profile.full_name || "")
  const [isSaving, setIsSaving] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast({ title: "Error", description: "Name cannot be empty", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()

      // Get current user to ensure we update the right profile
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        toast({ title: "Error", description: "Please login again", variant: "destructive" })
        return
      }

      const { error } = await supabase.from("profiles").update({ full_name: newName.trim() }).eq("id", user.id)

      if (error) {
        console.error("[v0] Update error:", error)
        toast({ title: "Error", description: error.message || "Failed to update name", variant: "destructive" })
        return
      }

      toast({ title: "Success", description: "Name updated successfully" })
      setIsEditOpen(false)
      router.refresh()
    } catch (error: any) {
      console.error("[v0] Save error:", error)
      toast({ title: "Error", description: error?.message || "Failed to update name", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const displayName = profile.full_name || profile.email.split("@")[0]
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1)
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-4 md:justify-end md:px-6">
          <div className="md:hidden" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{capitalizedName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">{initial}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{capitalizedName}</p>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Name
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Your Name</DialogTitle>
            <DialogDescription>Change your display name that appears across the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveName} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
