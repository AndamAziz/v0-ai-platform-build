import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse body as text first, then JSON parse
    const bodyText = await request.text()
    
    let body: { data?: string; fileName?: string; fileType?: string; fileSize?: number }
    try {
      body = JSON.parse(bodyText)
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const base64Data = body.data
    const originalName = body.fileName || "uploaded-image.png"
    const fileType = body.fileType || "image/png"
    const fileSize = body.fileSize || 0

    if (!base64Data || typeof base64Data !== "string") {
      return NextResponse.json({ error: "No file data provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid file type: ${fileType}. Allowed: JPEG, PNG, WebP, GIF` },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = originalName?.split(".").pop() || "png"
    const fileName = `upload-${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Decode base64 to buffer
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, "")
    const binaryString = atob(base64String)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const { error: uploadError } = await supabase.storage
      .from("generations")
      .upload(fileName, bytes, {
        contentType: fileType,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("generations")
      .getPublicUrl(fileName)

    // Save to generations table
    const { data: generation, error: dbError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        type: "image",
        provider: "upload",
        prompt: originalName,
        status: "completed",
        result_url: publicUrl.publicUrl,
        credits_used: 0,
        metadata: {
          original_name: originalName,
          file_size: fileSize,
          file_type: fileType,
          uploaded: true,
        },
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
    }

    return NextResponse.json({
      url: publicUrl.publicUrl,
      id: generation?.id,
      fileName: fileName,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}
