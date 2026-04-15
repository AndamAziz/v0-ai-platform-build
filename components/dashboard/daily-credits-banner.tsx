"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Gift, Clock, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import type { Profile } from "@/lib/types"

interface DailyCreditsBannerProps {
  profile: Profile
}

export function DailyCreditsBanner({ profile }: DailyCreditsBannerProps) {
  const [canClaim, setCanClaim] = useState(false)
  const [timeLeft, setTimeLeft] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const checkEligibility = () => {
      if (!profile.last_daily_credit) {
        setCanClaim(true)
        return
      }

      const lastClaim = new Date(profile.last_daily_credit)
      const nextClaim = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000)
      const now = new Date()

      if (now >= nextClaim) {
        setCanClaim(true)
        setTimeLeft("")
      } else {
        setCanClaim(false)
        const diff = nextClaim.getTime() - now.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setTimeLeft(`${hours}h ${minutes}m`)
      }
    }

    checkEligibility()
    const interval = setInterval(checkEligibility, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [profile.last_daily_credit])

  // Check if admin - admins don't need daily credits
  const isAdmin = profile.role === "admin"

  const handleClaim = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/credits/daily", { method: "POST" })
      const data = await res.json()

      if (data.success) {
        setShowSuccess(true)
        setCanClaim(false)
        toast.success(`You received 10 free credits! New balance: ${data.newBalance}`)

        // Refresh the page to update the credits display
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        toast.info("Come back later to claim your free credits!")
      }
    } catch (error) {
      toast.error("Failed to claim credits")
    } finally {
      setIsLoading(false)
    }
  }

  if (isDismissed && !canClaim) return null

  if (showSuccess) {
    return (
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 animate-pulse">
        <div className="flex items-center justify-center gap-2 text-green-400">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">+10 Credits Added!</span>
          <Sparkles className="h-5 w-5" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 ${
        canClaim
          ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30"
          : "bg-muted/50 border border-border"
      }`}
    >
      {!canClaim && (
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${canClaim ? "bg-purple-500/20" : "bg-muted"}`}>
            {canClaim ? (
              <Gift className="h-5 w-5 text-purple-400" />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-sm sm:text-base">
              {canClaim ? "Daily Free Credits Available!" : "Daily Credits"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {canClaim ? "Claim your 10 free credits now" : `Next claim in ${timeLeft}`}
            </p>
          </div>
        </div>

        <Button
          onClick={handleClaim}
          disabled={!canClaim || isLoading || isAdmin}
          size="sm"
          className={
            canClaim && !isAdmin
              ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              : ""
          }
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Claiming...
            </span>
          ) : canClaim && !isAdmin ? (
            <span className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Claim 10 Credits
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {timeLeft}
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
