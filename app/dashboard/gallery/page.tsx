import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { GalleryView } from "@/components/gallery/gallery-view"
import { WebsiteGallery } from "@/components/gallery/website-gallery"
import { ImageIcon, VideoIcon, MicIcon, GlobeIcon, FolderOpen, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const params = await searchParams
  const type = params.type || "all"

  // Fetch media generations (image, video, voice)
  const { data: mediaGenerations } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .in("type", ["image", "video", "voice"])
    .not("result_url", "is", null)
    .neq("result_url", "")
    .order("created_at", { ascending: false })

  // Fetch website generations
  const { data: websiteGenerations } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .eq("type", "website")
    .not("result_url", "is", null)
    .neq("result_url", "")
    .order("created_at", { ascending: false })

  const generations = mediaGenerations || []
  const websites = websiteGenerations || []

  const imageCounts = generations.filter((g) => g.type === "image").length
  const videoCounts = generations.filter((g) => g.type === "video").length
  const voiceCounts = generations.filter((g) => g.type === "voice").length
  const websiteCounts = websites.length

  const isWebsiteTab = type === "website"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
            <FolderOpen className="h-7 w-7 text-primary" />
            My Gallery
          </h1>
          <p className="text-muted-foreground mt-1">
            Your AI-generated content - browse, preview, and manage all your creations
          </p>
        </div>

        {/* Quick Create Buttons */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard/image">
            <Button size="sm" variant="outline" className="gap-1 bg-transparent">
              <Plus className="h-4 w-4" />
              <ImageIcon className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/video">
            <Button size="sm" variant="outline" className="gap-1 bg-transparent">
              <Plus className="h-4 w-4" />
              <VideoIcon className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/voice">
            <Button size="sm" variant="outline" className="gap-1 bg-transparent">
              <Plus className="h-4 w-4" />
              <MicIcon className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/website">
            <Button size="sm" variant="outline" className="gap-1 bg-transparent">
              <Plus className="h-4 w-4" />
              <GlobeIcon className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats cards - Clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/dashboard/gallery?type=image">
          <div
            className={`bg-gradient-to-br from-blue-500/10 to-blue-600/5 border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${type === "image" ? "border-blue-500 ring-2 ring-blue-500/20" : "border-blue-500/20"}`}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/20 rounded-lg">
                <ImageIcon className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{imageCounts}</p>
                <p className="text-[10px] text-muted-foreground">Images</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/gallery?type=video">
          <div
            className={`bg-gradient-to-br from-purple-500/10 to-purple-600/5 border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${type === "video" ? "border-purple-500 ring-2 ring-purple-500/20" : "border-purple-500/20"}`}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/20 rounded-lg">
                <VideoIcon className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{videoCounts}</p>
                <p className="text-[10px] text-muted-foreground">Videos</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/gallery?type=voice">
          <div
            className={`bg-gradient-to-br from-green-500/10 to-green-600/5 border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${type === "voice" ? "border-green-500 ring-2 ring-green-500/20" : "border-green-500/20"}`}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-500/20 rounded-lg">
                <MicIcon className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{voiceCounts}</p>
                <p className="text-[10px] text-muted-foreground">Voice</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/gallery?type=website">
          <div
            className={`bg-gradient-to-br from-orange-500/10 to-orange-600/5 border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${type === "website" ? "border-orange-500 ring-2 ring-orange-500/20" : "border-orange-500/20"}`}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-500/20 rounded-lg">
                <GlobeIcon className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{websiteCounts}</p>
                <p className="text-[10px] text-muted-foreground">Websites</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Content */}
      {isWebsiteTab ? (
        <WebsiteGallery websites={websites} />
      ) : (
        <GalleryView generations={generations} type={type} isAdmin={profile?.role === "admin"} />
      )}
    </div>
  )
}
