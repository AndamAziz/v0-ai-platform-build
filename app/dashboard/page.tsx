import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { ImageIcon, VideoIcon, MicIcon, Sparkles, MessageSquare, Globe, Zap } from "lucide-react"
import Link from "next/link"
import { DailyCreditsBanner } from "@/components/dashboard/daily-credits-banner"
import type { Profile } from "@/lib/types"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single()

  const { count: imageCount } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user?.id)
    .eq("type", "image")
    .eq("status", "completed")
    .not("result_url", "is", null)
    .neq("result_url", "")

  const { count: videoCount } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user?.id)
    .eq("type", "video")
    .eq("status", "completed")
    .not("result_url", "is", null)
    .neq("result_url", "")

  const { count: voiceCount } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user?.id)
    .eq("type", "voice")
    .eq("status", "completed")
    .not("result_url", "is", null)
    .neq("result_url", "")

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-8">
        {/* 1. Daily Credits Banner - Full Width */}
        {profile && (
          <div className="w-full">
            <DailyCreditsBanner profile={profile as Profile} />
          </div>
        )}

        {/* 2. Create New Section - 2 rows x 3 columns on desktop */}
        <div>
          <h2 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6 text-foreground/80">Create New</h2>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
            <Link href="/dashboard/image" className="block">
              <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl bg-card cursor-pointer h-full">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex flex-col items-center gap-2 lg:gap-3">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                      <ImageIcon className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
                    </div>
                    <span className="text-xs lg:text-sm font-medium text-center">Image</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/video" className="block">
              <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl bg-card cursor-pointer h-full">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex flex-col items-center gap-2 lg:gap-3">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                      <VideoIcon className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
                    </div>
                    <span className="text-xs lg:text-sm font-medium text-center">Video</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/voice" className="block">
              <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl bg-card cursor-pointer h-full">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex flex-col items-center gap-2 lg:gap-3">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                      <MicIcon className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
                    </div>
                    <span className="text-xs lg:text-sm font-medium text-center">Voice</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/chat" className="block">
              <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl bg-card cursor-pointer h-full">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex flex-col items-center gap-2 lg:gap-3">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                      <MessageSquare className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
                    </div>
                    <span className="text-xs lg:text-sm font-medium text-center">AI Chat</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/website" className="block">
              <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl bg-card cursor-pointer h-full">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex flex-col items-center gap-2 lg:gap-3">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                      <Globe className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
                    </div>
                    <span className="text-xs lg:text-sm font-medium text-center">Website</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/gallery" className="block">
              <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl bg-card cursor-pointer h-full">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex flex-col items-center gap-2 lg:gap-3">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                      <Sparkles className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
                    </div>
                    <span className="text-xs lg:text-sm font-medium text-center">Gallery</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* 3. Stats Cards - 4 in a row on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Credits Card */}
          <Card className="group relative overflow-hidden border-0 shadow-lg shadow-amber-500/5 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <CardContent className="p-6 lg:p-8">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="text-center">
                  <span className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {profile?.role === "admin" ? "∞" : profile?.credits || 0}
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">Available Credits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images Card */}
          <Link href="/dashboard/gallery?type=image" className="block">
            <Card className="group relative overflow-hidden border-0 shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 cursor-pointer h-full">
              <CardContent className="p-6 lg:p-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <ImageIcon className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
                  </div>
                  <div className="text-center">
                    <span className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {imageCount || 0}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">Images Created</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Videos Card */}
          <Link href="/dashboard/gallery?type=video" className="block">
            <Card className="group relative overflow-hidden border-0 shadow-lg shadow-purple-500/5 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 cursor-pointer h-full">
              <CardContent className="p-6 lg:p-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <VideoIcon className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
                  </div>
                  <div className="text-center">
                    <span className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {videoCount || 0}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">Videos Created</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Voice Card */}
          <Link href="/dashboard/gallery?type=voice" className="block">
            <Card className="group relative overflow-hidden border-0 shadow-lg shadow-green-500/5 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-1 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 cursor-pointer h-full">
              <CardContent className="p-6 lg:p-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform duration-300">
                    <MicIcon className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
                  </div>
                  <div className="text-center">
                    <span className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {voiceCount || 0}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">Voice Created</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
