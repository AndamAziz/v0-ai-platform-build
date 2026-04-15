import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CREDIT_COSTS } from "@/lib/types"
import { put } from "@vercel/blob"

const JSON2VIDEO_API_URL = "https://api.json2video.com/v2/movies"

// Convert base64 data URL to Blob URL using fetch API
async function uploadBase64ToBlob(dataUrl: string, userId: string): Promise<string> {
  if (!dataUrl.startsWith("data:")) {
    return dataUrl // Already a URL
  }
  
  // Convert data URL to Blob using fetch
  const response = await fetch(dataUrl)
  const blobData = await response.blob()
  
  const extension = blobData.type.split("/")[1] || "jpg"
  const filename = `json2video/${userId}-${Date.now()}.${extension}`
  
  const blob = await put(filename, blobData, {
    access: "public",
    contentType: blobData.type,
  })
  
  console.log("[JSON2Video] Uploaded image to Blob:", blob.url)
  return blob.url
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, role")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check credits (admin has unlimited)
    const isUnlimited = profile.role === "admin"
    if (!isUnlimited && profile.credits < CREDIT_COSTS.video) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    const body = await req.json()
    const { 
      prompt, 
      aspectRatio, 
      videoUrl, 
      audioUrl, 
      duration,
      template,
    } = body

    const apiKey = process.env.JSON2VIDEO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "JSON2Video API key not configured" }, { status: 500 })
    }

    // Create generation record
    const { data: generation, error: genError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        type: "video",
        provider: "json2video",
        prompt: prompt || "JSON2Video generation",
        status: "processing",
        metadata: {
          aspectRatio,
          videoUrl,
          audioUrl,
          duration,
          template,
        },
      })
      .select()
      .single()

    if (genError) {
      console.error("[JSON2Video] Generation record error:", genError)
      return NextResponse.json({ error: "Failed to create generation record" }, { status: 500 })
    }

    // Build JSON2Video request
    const resolution = aspectRatio === "9:16" ? "portrait-1080p" : "full-hd"
    
    // JSON2Video requires either a video or image - it cannot generate AI video from text
    if (!videoUrl && !audioUrl) {
      return NextResponse.json({ 
        error: "JSON2Video requires a video/image and audio to merge. Use VPS2 or Hugging Face for AI video generation." 
      }, { status: 400 })
    }

    // Convert base64 image to Blob URL if needed
    let imageUrl = videoUrl
    if (videoUrl && videoUrl.startsWith("data:")) {
      try {
        imageUrl = await uploadBase64ToBlob(videoUrl, user.id)
      } catch (uploadErr: any) {
        console.error("[JSON2Video] Image upload error:", uploadErr)
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
      }
    }

    // Build scenes based on input
    const scenes: any[] = []
    const elements: any[] = []
    
    if (imageUrl) {
      // Check if it's an image or video by URL
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(imageUrl) || imageUrl.includes("blob.vercel")
      
      if (isImage) {
        // Image - create a video from image
        // Duration -1 means use the audio duration (maximum)
        elements.push({
          type: "image",
          src: imageUrl,
          duration: -1, // Use full audio duration
        })
      } else {
        // Video file
        elements.push({
          type: "video",
          src: imageUrl,
          duration: -1, // Use full duration
        })
      }
    }

    // Add audio (required for merge functionality)
    if (audioUrl) {
      elements.push({
        type: "audio",
        src: audioUrl,
        volume: 1,
        duration: -1, // Full audio duration
      })
    }
    
    scenes.push({
      comment: "Merged video with audio",
      elements,
    })

    const movieRequest = {
      resolution,
      quality: "high",
      scenes,
    }

    console.log("[JSON2Video] Request:", JSON.stringify(movieRequest, null, 2))

    // Send request to JSON2Video API
    const response = await fetch(JSON2VIDEO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(movieRequest),
    })

    const data = await response.json()
    console.log("[JSON2Video] Response:", data)

    if (!response.ok) {
      await supabase
        .from("generations")
        .update({ status: "failed", error_message: data.error || "API Error" })
        .eq("id", generation.id)
      
      return NextResponse.json({ 
        error: data.error || "JSON2Video API error",
        details: data,
      }, { status: response.status })
    }

    // JSON2Video returns a project ID for async processing
    // Response can be: { success, project } or { project } or { success, movie: { project } }
    const projectId = data.project || data.movie?.project || data.id
    
    console.log("[JSON2Video] Project ID:", projectId)

    if (!projectId) {
      // If no project ID but success, try to get URL directly
      if (data.url || data.movie?.url) {
        const directUrl = data.url || data.movie?.url
        await supabase
          .from("generations")
          .update({
            status: "completed",
            result_url: directUrl,
          })
          .eq("id", generation.id)
        
        if (!isUnlimited) {
          await supabase.rpc("decrement_credits", {
            user_id: user.id,
            amount: CREDIT_COSTS.video,
          })
        }
        
        return NextResponse.json({
          success: true,
          videoUrl: directUrl,
          generationId: generation.id,
          provider: "json2video",
        })
      }
      
      return NextResponse.json({ 
        error: "No project ID returned", 
        response: data 
      }, { status: 500 })
    }

    // Update generation with project ID
    await supabase
      .from("generations")
      .update({ 
        metadata: { 
          ...generation.metadata,
          projectId,
        }
      })
      .eq("id", generation.id)

    // Poll for completion
    const videoResult = await pollForCompletion(projectId, apiKey)

    if (videoResult.error) {
      await supabase
        .from("generations")
        .update({ status: "failed", error_message: videoResult.error })
        .eq("id", generation.id)
      
      return NextResponse.json({ error: videoResult.error }, { status: 500 })
    }

    // Update generation record
    await supabase
      .from("generations")
      .update({
        status: "completed",
        result_url: videoResult.url,
      })
      .eq("id", generation.id)

    // Deduct credits
    if (!isUnlimited) {
      await supabase.rpc("decrement_credits", {
        user_id: user.id,
        amount: CREDIT_COSTS.video,
      })
    }

    return NextResponse.json({
      success: true,
      videoUrl: videoResult.url,
      generationId: generation.id,
      provider: "json2video",
    })

  } catch (error: any) {
    console.error("[JSON2Video] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

async function pollForCompletion(projectId: string, apiKey: string, maxAttempts = 60): Promise<{ url?: string; error?: string }> {
  // JSON2Video uses query parameter for status check
  const pollUrl = `${JSON2VIDEO_API_URL}?project=${projectId}`
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(pollUrl, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      })
      
      const data = await response.json()
      console.log(`[JSON2Video] Poll ${i + 1}:`, data)
      
      // Response structure: { success, movie: { status, url, ... } }
      const movie = data.movie || data
      const status = movie.status || data.status
      
      if (status === "done") {
        return { url: movie.url || data.url }
      }
      
      if (status === "failed" || status === "error") {
        return { error: movie.message || data.message || data.error || "Video generation failed" }
      }
      
      // Wait 3 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 3000))
    } catch (err) {
      console.error("[JSON2Video] Poll error:", err)
    }
  }
  
  return { error: "Timeout waiting for video completion" }
}
