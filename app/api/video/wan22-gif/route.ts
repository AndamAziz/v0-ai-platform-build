import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { CREDIT_COSTS } from "@/lib/types"
import { put } from "@vercel/blob"

const VPS2_API_KEY = process.env.VPS2_API_KEY
const VPS2_CREATE_GIF_API_URL = "https://your-vps2-create-gif-api-url.com/api/create-gif"

export const maxDuration = 60

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY

// Generate a single image using HuggingFace FLUX
async function generateImage(prompt: string): Promise<Buffer | null> {
  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    )
    
    if (!response.ok) {
      return null
    }
    
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (profile.role !== "admin" && profile.credits < CREDIT_COSTS.video) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 400 })
    }

    // Parse request - can be JSON or FormData
    let prompt: string = ""
    let imageBase64: string | null = null
    let negativePrompt: string = ""
    let durationSeconds: number = 3
    let guidanceScale: number = 7.5
    let steps: number = 20
    let video_url: string | null = null
    let videoId: string | null = null
    let mp3_url: string | null = null // Audio URL for GIF to video conversion

    const contentType = request.headers.get("content-type") || ""
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      prompt = formData.get("prompt")?.toString() || ""
      negativePrompt = formData.get("negative_prompt")?.toString() || ""
      durationSeconds = parseFloat(formData.get("duration_seconds")?.toString() || "3")
      guidanceScale = parseFloat(formData.get("guidance_scale")?.toString() || "7.5")
      steps = parseInt(formData.get("steps")?.toString() || "20")
      
      const imageFile = formData.get("input_image") as File | null
      if (imageFile && imageFile.size > 0) {
        const arrayBuffer = await imageFile.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString("base64")
        const mimeType = imageFile.type || "image/png"
        imageBase64 = `data:${mimeType};base64,${base64}`
      }
    } else {
      const body = await request.json()
      prompt = body.prompt || ""
      imageBase64 = body.imageUrl || body.input_image || null
      negativePrompt = body.negative_prompt || ""
      durationSeconds = body.duration_seconds || 3
      guidanceScale = body.guidance_scale || 7.5
      steps = body.steps || 20
      video_url = body.video_url || null
      videoId = body.videoId || null
      mp3_url = body.mp3_url || body.audioUrl || null // Audio URL for GIF to video
      
      // Merge mode removed - use /api/video/merge instead
      if (body.merge_mode) {
        return NextResponse.json({ 
          error: "Merge mode not supported. Use /api/video/merge endpoint instead." 
        }, { status: 400 })
      }
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    

    // Create generation record
    const { data: generation, error: genError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        type: "video",
        provider: "wan22-gif",
        prompt: prompt,
        status: "processing",
        credits_used: CREDIT_COSTS.video,
        metadata: {
          mode: imageBase64 ? "image-to-video" : "text-to-video",
          hasInputImage: !!imageBase64,
          durationSeconds,
          guidanceScale,
          steps,
        },
      })
      .select()
      .single()

    if (genError) {
      return NextResponse.json({ error: "Failed to create generation record" }, { status: 500 })
    }

    try {
      if (!HUGGINGFACE_API_KEY) {
        throw new Error("HuggingFace API key not configured")
      }

      // Generate 4 images with variations
      const basePrompt = prompt.trim()
      const prompts = [
        basePrompt,
        `${basePrompt}, different angle`,
        `${basePrompt}, slight variation`,
        `${basePrompt}, another perspective`
      ]

      // Generate images in parallel
      const imagePromises = prompts.map(p => generateImage(p))
      const imageBuffers = await Promise.all(imagePromises)
      
      // Filter out failed images
      const validImages = imageBuffers.filter((buf): buf is Buffer => buf !== null)
      
      if (validImages.length < 2) {
        throw new Error("Failed to generate enough images for GIF")
      }

      // Return the images as base64 for client-side GIF creation
      const imagesBase64 = validImages.map(buf => `data:image/png;base64,${buf.toString("base64")}`)
      
      // Save first image as result preview
      const previewFileName = `gif-preview-${Date.now()}.png`
      const { url: previewUrl } = await put(previewFileName, validImages[0], {
        access: "public",
        contentType: "image/png",
      })

      // Update generation record
      await supabase
        .from("generations")
        .update({
          status: "completed",
          result_url: previewUrl,
          completed_at: new Date().toISOString(),
          metadata: {
            mode: "text-to-images",
            frames: validImages.length,
            isGifFrames: true,
          },
        })
        .eq("id", generation.id)

      // Deduct credits if not admin
      if (profile.role !== "admin") {
        await supabase
          .from("profiles")
          .update({ credits: profile.credits - CREDIT_COSTS.video })
          .eq("id", user.id)
      }

      return NextResponse.json({
        success: true,
        images: imagesBase64,
        preview_url: previewUrl,
        generationId: generation.id,
        message: "Images generated. Create GIF in browser.",
      })
    } catch (error: any) {
      // Update generation record with error
      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_message: error.message,
        })
        .eq("id", generation.id)

      if (error.name === "AbortError") {
        return NextResponse.json({ error: "Request timed out - try again later" }, { status: 504 })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
