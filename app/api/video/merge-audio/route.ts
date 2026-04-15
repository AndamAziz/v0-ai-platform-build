import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoUrl, audioUrl } = await req.json()

    if (!videoUrl || !audioUrl) {
      return NextResponse.json({ error: "Video URL and Audio URL are required" }, { status: 400 })
    }

    console.log("[Merge-Audio] Starting merge...")
    console.log("[Merge-Audio] Video:", videoUrl.substring(0, 80))
    console.log("[Merge-Audio] Audio:", audioUrl.substring(0, 80))

    // Server-side merge is not available
    // Return both URLs for client-side handling
    console.log("[Merge-Audio] Returning both URLs for separate download")
    return NextResponse.json({
      success: true,
      videoUrl: videoUrl,
      audioUrl: audioUrl,
      separateDownload: true,
      note: "Download video and audio separately. Use a video editor to merge them.",
    })

  } catch (error) {
    console.error("[Merge-Audio] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Merge failed" },
      { status: 500 }
    )
  }
}
