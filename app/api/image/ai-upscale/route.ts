import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"
import sharp from "sharp"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile for credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, role")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check credits (1 credit for upscale)
    const isAdmin = profile.role === "admin"
    if (!isAdmin && profile.credits < 1) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    const { imageUrl, scale = 2 } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL required" }, { status: 400 })
    }

    // Validate scale (max 4x to prevent memory issues)
    const validScale = Math.min(Math.max(Number(scale), 1), 4)

    // Fetch the image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image")
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata()
    const width = metadata.width || 512
    const height = metadata.height || 512

    // Calculate new dimensions
    const newWidth = Math.round(width * validScale)
    const newHeight = Math.round(height * validScale)

    // Upscale using sharp with lanczos3 algorithm (high quality)
    const upscaledBuffer = await sharp(imageBuffer)
      .resize(newWidth, newHeight, {
        kernel: sharp.kernel.lanczos3,
        fit: "fill",
      })
      .sharpen({ sigma: 0.5 }) // Light sharpening after upscale
      .png()
      .toBuffer()

    // Upload to Vercel Blob
    const fileName = `upscaled-${Date.now()}.png`
    const { url: resultUrl } = await put(fileName, upscaledBuffer, {
      access: "public",
      contentType: "image/png",
    })

    // Deduct credit
    if (!isAdmin) {
      await supabase
        .from("profiles")
        .update({ credits: profile.credits - 1 })
        .eq("id", user.id)
    }

    // Save to generations
    await supabase.from("generations").insert({
      user_id: user.id,
      type: "image",
      prompt: `AI Upscale ${validScale}x`,
      result_url: resultUrl,
      provider: "sharp",
      model: "upscale",
    })

    return NextResponse.json({
      success: true,
      url: resultUrl,
      scale: validScale,
      dimensions: { width: newWidth, height: newHeight },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upscale failed" },
      { status: 500 }
    )
  }
}
