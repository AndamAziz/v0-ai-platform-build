"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const clearStaleSession = async () => {
      const supabase = createClient()
      try {
        const { error } = await supabase.auth.getUser()
        if (error && (error.message.includes("session") || error.message.includes("Session"))) {
          await supabase.auth.signOut()
        }
      } catch {
        await supabase.auth.signOut()
      }
    }
    clearStaleSession()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4 py-8 sm:p-6 relative overflow-hidden">
      {/* Kurdistan Map Background - Hidden on small mobile */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 opacity-[0.07] pointer-events-none hidden sm:block">
        <Image
          src="/images/kurdistan-map.png"
          alt="Kurdistan Map"
          width={600}
          height={500}
          className="object-contain"
        />
      </div>
      
      <div className="w-full max-w-[340px] sm:max-w-sm relative z-10">
        {/* Kurdistan Map Above Logo */}
        <div className="mb-4 sm:mb-6 flex justify-center">
          <div className="relative group">
            <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-[#ED2024]/20 via-[#FDB913]/20 to-[#009A44]/20 blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
            <Image
              src="/images/kurdistan-map.png"
              alt="Kurdistan Map"
              width={100}
              height={85}
              className="relative drop-shadow-xl sm:w-[140px] sm:h-[120px]"
            />
          </div>
        </div>
        
        {/* Logo */}
        <div className="mb-4 sm:mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ED2024] via-[#FDB913] to-[#009A44]">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-gray-900">AI Studio</span>
        </div>

        <Card className="border-0 shadow-xl sm:border sm:shadow-lg">
          <CardHeader className="space-y-1 px-4 sm:px-6 pt-5 sm:pt-6 pb-2">
            <CardTitle className="text-xl sm:text-2xl text-center sm:text-left">Welcome back</CardTitle>
            <CardDescription className="text-center sm:text-left text-sm">
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-5 sm:pb-6">
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 sm:h-10 text-base sm:text-sm"
                  />
                </div>
                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 sm:h-10 text-base sm:text-sm"
                  />
                </div>
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-10 text-base sm:text-sm font-medium bg-gradient-to-r from-[#ED2024] to-[#009A44] hover:opacity-90 mt-1" 
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </div>
              <div className="mt-5 sm:mt-4 text-center text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <Link 
                  href="/auth/sign-up" 
                  className="font-medium text-[#009A44] hover:text-[#007A34] underline underline-offset-4"
                >
                  Sign up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer for mobile */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Powered by AI Studio
        </p>
      </div>
    </div>
  )
}
