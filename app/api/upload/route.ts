import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 20MB" }, { status: 400 })
    }

    // Get file extension
    const ext = file.name.split(".").pop() || "bin"
    const fileName = `${user.id}-${Date.now()}.${ext}`
    
    // Determine content type
    let contentType = file.type
    if (!contentType || contentType === "application/octet-stream") {
      // Guess based on extension
      const mimeTypes: Record<string, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        m4a: "audio/mp4",
        ogg: "audio/ogg",
        flac: "audio/flac",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        mp4: "video/mp4",
        webm: "video/webm",
      }
      contentType = mimeTypes[ext.toLowerCase()] || "application/octet-stream"
    }

    // Upload to Vercel Blob
    const { url } = await put(fileName, file, {
      access: "public",
      contentType,
    })

    return NextResponse.json({
      success: true,
      url,
      fileName: file.name,
      size: file.size,
      type: contentType,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}
