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

    const body = await request.json()
    const { imageData, format = "png", quality = 0.9 } = body

    if (!imageData) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 })
    }

    // Extract base64 data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")

    // Generate unique filename
    const fileName = `edited-${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${format}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("generations")
      .upload(fileName, buffer, {
        contentType: `image/${format}`,
        upsert: false,
      })

    if (uploadError) {
      console.error("[v0] Upload error:", uploadError)
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
        provider: "edit",
        prompt: "Edited image",
        status: "completed",
        result_url: publicUrl.publicUrl,
        credits_used: 0,
        metadata: {
          format,
          quality,
          edited: true,
        },
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)
    }

    return NextResponse.json({
      url: publicUrl.publicUrl,
      id: generation?.id,
      fileName: fileName,
    })
  } catch (error) {
    console.error("[v0] Edit request error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Edit failed" },
      { status: 500 }
    )
  }
}
