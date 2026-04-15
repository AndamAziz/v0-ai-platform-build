import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"

// HuggingFace API for background removal using BRIA model
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY

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

    const { imageUrl, imageData } = await req.json()

    if (!imageUrl && !imageData) {
      return NextResponse.json({ error: "Image URL or data required" }, { status: 400 })
    }

    if (!HUGGINGFACE_API_KEY) {
      return NextResponse.json({ error: "HuggingFace API key not configured" }, { status: 500 })
    }

    // Get image buffer from base64 or URL
    let imageBuffer: ArrayBuffer
    
    if (imageData && imageData.startsWith("data:")) {
      // Base64 image from canvas - resize if too large
      const base64Data = imageData.split(",")[1]
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      imageBuffer = bytes.buffer
      
      // Check size - HuggingFace has ~10MB limit
      // If larger than 5MB, we need to compress
      if (imageBuffer.byteLength > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Image too large. Please use an image smaller than 5MB." },
          { status: 413 }
        )
      }
    } else if (imageUrl) {
      // URL - fetch the image
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error("Failed to fetch image")
      }
      imageBuffer = await imageResponse.arrayBuffer()
      
      if (imageBuffer.byteLength > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Image too large. Please use an image smaller than 5MB." },
          { status: 413 }
        )
      }
    } else {
      throw new Error("Invalid image data")
    }

    // Use HuggingFace BRIA Background Removal model
    // Try multiple endpoints for reliability
    const endpoints = [
      "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
      "https://api-inference.huggingface.co/models/BRIA-AI/RMBG-1.4",
      "https://api-inference.huggingface.co/models/schirrmacher/rembg-background-removal",
    ]
    
    let response: Response | null = null
    let lastError = ""
    
    for (const endpoint of endpoints) {
      // Retry up to 5 times per endpoint for model loading (503)
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/octet-stream",
            },
            body: imageBuffer,
          })
          
          if (response.ok) {
            break
          }
          
          // Clone before reading body
          const clonedResponse = response.clone()
          lastError = await clonedResponse.text()
          
          // If model is loading (503), wait and retry
          if (response.status === 503) {
            // Parse estimated_time if available
            let waitTime = 10000
            try {
              const errorJson = JSON.parse(lastError)
              if (errorJson.estimated_time) {
                waitTime = Math.min(errorJson.estimated_time * 1000, 30000)
              }
            } catch {}
            
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
          
          // Other error - try next endpoint
          break
        } catch (e) {
          lastError = e instanceof Error ? e.message : "Unknown error"
          response = null
          break
        }
      }
      
      if (response?.ok) break
    }
    
    if (!response || !response.ok) {
      if (lastError.includes("loading") || lastError.includes("503") || lastError.includes("estimated_time")) {
        throw new Error("Model is still loading. Please wait 30 seconds and try again.")
      }
      
      throw new Error(`Background removal failed: ${lastError.substring(0, 100)}`)
    }

    // Get the result image
    const resultBuffer = await response.arrayBuffer()
    
    if (resultBuffer.byteLength === 0) {
      throw new Error("Empty result returned")
    }
    
    // Upload to Vercel Blob
    const fileName = `nobg-${Date.now()}.png`
    const { url: resultUrl } = await put(fileName, resultBuffer, {
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
      prompt: "Remove Background",
      result_url: resultUrl,
      provider: "huggingface",
      model: "RMBG-1.4",
    })

    return NextResponse.json({
      success: true,
      url: resultUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Background removal failed" },
      { status: 500 }
    )
  }
}
