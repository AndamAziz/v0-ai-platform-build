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

    // Check credits (1 credit)
    const isAdmin = profile.role === "admin"
    if (!isAdmin && profile.credits < 1) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    const { imageUrl, enhanceType = "general" } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL required" }, { status: 400 })
    }

    // Fetch the image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image")
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Apply enhancements using sharp
    let sharpInstance = sharp(imageBuffer)
    
    // Get enhancement parameters based on type
    const params = getEnhanceParams(enhanceType)
    
    // Apply modulations (brightness, saturation)
    sharpInstance = sharpInstance.modulate({
      brightness: params.brightness,
      saturation: params.saturation,
    })
    
    // Apply contrast using linear
    if (params.contrast !== 1) {
      sharpInstance = sharpInstance.linear(params.contrast, -(128 * params.contrast) + 128)
    }
    
    // Apply sharpening
    if (params.sharpness > 0) {
      sharpInstance = sharpInstance.sharpen({
        sigma: params.sharpness,
      })
    }
    
    // Convert to PNG buffer
    const enhancedBuffer = await sharpInstance.png().toBuffer()
    
    // Upload to Vercel Blob
    const fileName = `enhanced-${Date.now()}.png`
    const { url: resultUrl } = await put(fileName, enhancedBuffer, {
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
      prompt: `AI Enhance (${enhanceType})`,
      result_url: resultUrl,
      provider: "sharp",
      model: "enhance",
    })

    return NextResponse.json({
      success: true,
      url: resultUrl,
      enhanceType,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enhancement failed" },
      { status: 500 }
    )
  }
}

// Get enhancement parameters based on type
function getEnhanceParams(type: string) {
  switch (type) {
    case "portrait":
      return { brightness: 1.05, contrast: 1.1, saturation: 1.05, sharpness: 0.8 }
    case "landscape":
      return { brightness: 1.1, contrast: 1.2, saturation: 1.15, sharpness: 1.2 }
    case "night":
      return { brightness: 1.3, contrast: 1.1, saturation: 1.0, sharpness: 0.5 }
    case "hdr":
      return { brightness: 1.1, contrast: 1.3, saturation: 1.2, sharpness: 1.5 }
    case "general":
    default:
      return { brightness: 1.1, contrast: 1.15, saturation: 1.1, sharpness: 1.0 }
  }
}
