import { createClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { video_url, generation_id } = body

    if (!video_url) {
      return NextResponse.json({ error: "Video URL is required" }, { status: 400 })
    }

    // Fetch video from external URL
    const response = await fetch(video_url)
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch video" }, { status: 400 })
    }

    const videoBuffer = await response.arrayBuffer()

    // Upload to Vercel Blob (works reliably)
    const fileName = `${user.id}-video-${Date.now()}.mp4`
    const blob = await put(fileName, videoBuffer, {
      access: "public",
      contentType: "video/mp4",
    })

    const permanentUrl = blob.url

    // Update generation record if generation_id provided
    if (generation_id) {
      await supabase
        .from("generations")
        .update({
          result_url: permanentUrl,
          status: "completed",
          metadata: {
            original_external_url: video_url,
            saved_to_storage: true,
          }
        })
        .eq("id", generation_id)
        .eq("user_id", user.id)
    }

    return NextResponse.json({
      success: true,
      permanent_url: permanentUrl,
      original_url: video_url,
    })

  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to save video",
    }, { status: 500 })
  }
}
