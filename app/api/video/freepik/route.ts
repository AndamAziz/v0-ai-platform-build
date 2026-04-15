import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const maxDuration = 60

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY
const FREEPIK_API_URL = "https://api.freepik.com/v1/ai"

// Admin client for storage uploads
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Upload video from URL to Supabase storage for permanent storage
async function uploadVideoToSupabase(videoUrl: string, userId: string): Promise<string> {
  try {
    // Fetch video from Freepik URL
    const response = await fetch(videoUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`)
    }
    
    const videoBuffer = await response.arrayBuffer()
    const videoBlob = new Blob([videoBuffer], { type: "video/mp4" })
    
    const fileName = `videos/${userId}/freepik-${Date.now()}.mp4`
    const adminClient = getAdminClient()
    
    const { error: uploadError } = await adminClient.storage
      .from("generations")
      .upload(fileName, videoBlob, {
        contentType: "video/mp4",
        upsert: true,
      })
    
    if (uploadError) {
      console.error("[v0] Video upload error:", uploadError)
      // Return original URL if upload fails
      return videoUrl
    }
    
    const { data: publicUrlData } = adminClient.storage
      .from("generations")
      .getPublicUrl(fileName)
    
    return publicUrlData.publicUrl
  } catch (error) {
    console.error("[v0] Failed to upload video to Supabase:", error)
    // Return original URL if upload fails
    return videoUrl
  }
}

// Credit costs
const CREDIT_COSTS = {
  "wan-2.6-720p": 15,
  "wan-2.6-1080p": 20,
  "kling-o1-pro": 30,
  "kling-2.5-pro": 25,
}

type ModelType = keyof typeof CREDIT_COSTS

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user profile and credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, role")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const body = await request.json()
    const {
      prompt,
      model = "wan-2.6-720p",
      duration = 5,
      size = "1280x720",
      negative_prompt = "",
      image_url, // For image-to-video
      aspect_ratio = "16:9",
      use_face_reference = false, // Keep face consistent from image
    } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (!FREEPIK_API_KEY) {
      return NextResponse.json({ error: "Freepik API key not configured" }, { status: 500 })
    }

    // Check credits
    const creditCost = CREDIT_COSTS[model as ModelType] || 15
    if (profile.role !== "admin" && profile.credits < creditCost) {
      return NextResponse.json({ 
        error: `Insufficient credits. Need ${creditCost}, have ${profile.credits}` 
      }, { status: 402 })
    }

    // Create generation record
    const { data: generation, error: genError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        type: "video",
        provider: "freepik",
        status: "processing",
        prompt: prompt,
        model: `freepik-${model}`,
        metadata: { model, duration, size, aspect_ratio },
      })
      .select()
      .single()

    if (genError) {
      console.error("[v0] Generation insert error:", genError)
      return NextResponse.json({ error: "Failed to create generation record" }, { status: 500 })
    }

    // Determine endpoint based on model and whether image is provided
    const isKlingModel = model.includes("kling")
    let endpoint: string
    let requestBody: Record<string, unknown>
    let isImageToVideo = false

    // If Kling model selected but no image, fall back to WAN text-to-video
    if (isKlingModel && !image_url) {
      
    }

    if (image_url && isKlingModel) {
      // Image-to-video with Kling
      isImageToVideo = true
      const isKling25 = model.includes("kling-2.5")
      const klingModel = isKling25 ? "kling-v2-5-pro" : "kling-o1-pro"
      endpoint = `${FREEPIK_API_URL}/image-to-video/${klingModel}`
      
      // Convert aspect ratio based on model
      // Kling O1 Pro: '16:9', '9:16', '1:1'
      // Kling 2.5 Pro: 'widescreen_16_9', 'social_story_9_16', 'square_1_1'
      let klingAspectRatio: string
      if (isKling25) {
        // Kling 2.5 Pro format
        if (aspect_ratio === "9:16" || aspect_ratio === "social_story_9_16") {
          klingAspectRatio = "social_story_9_16"
        } else if (aspect_ratio === "1:1" || aspect_ratio === "square_1_1") {
          klingAspectRatio = "square_1_1"
        } else {
          klingAspectRatio = "widescreen_16_9"
        }
      } else {
        // Kling O1 Pro format (simpler)
        if (aspect_ratio === "9:16" || aspect_ratio === "social_story_9_16") {
          klingAspectRatio = "9:16"
        } else if (aspect_ratio === "1:1" || aspect_ratio === "square_1_1") {
          klingAspectRatio = "1:1"
        } else {
          klingAspectRatio = "16:9"
        }
      }
      
      requestBody = {
        prompt,
        first_frame: image_url,
        aspect_ratio: klingAspectRatio,
        duration: String(duration === 5 ? 5 : 10), // Must be string '5' or '10'
      }
      
      // Add face reference if requested (preserves face from image)
      if (use_face_reference) {
        requestBody.face_reference = image_url
      }
      
    } else {
      // Text-to-video with WAN
      const wanModel = model.includes("1080") ? "wan-v2-6-1080p" : "wan-v2-6-720p"
      endpoint = `${FREEPIK_API_URL}/text-to-video/${wanModel}`
      requestBody = {
        prompt,
        size,
        duration,
        negative_prompt: negative_prompt || "blurry, low quality, watermark, text, distortion",
        enable_prompt_expansion: true,
        shot_type: "single",
      }
      
    }

    

    // Call Freepik API with retry logic for 500 errors
    let response: Response | null = null
    let responseText = ""
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-freepik-api-key": FREEPIK_API_KEY,
          },
          body: JSON.stringify(requestBody),
        })
        
        responseText = await response.text()
        
        // Check if HTML error page (500 from Freepik)
        if (responseText.includes("<!DOCTYPE") || responseText.includes("<html")) {
          if (retryCount < maxRetries - 1) {
            retryCount++
            await new Promise(resolve => setTimeout(resolve, 2000))
            continue
          }
          // Last retry failed with HTML error
          await supabase
            .from("generations")
            .update({ status: "failed", metadata: { error: "Freepik server error" } })
            .eq("id", generation.id)
          return NextResponse.json({ 
            error: "Freepik server is temporarily busy. Please try again later.",
            retryable: true,
          }, { status: 503 })
        }
        
        // If 500 error and not last retry, wait and retry
        if (response.status === 500 && retryCount < maxRetries - 1) {
          retryCount++
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        break
      } catch (fetchError) {
        retryCount++
        if (retryCount >= maxRetries) {
          await supabase
            .from("generations")
            .update({ status: "failed", metadata: { error: "Freepik server unavailable" } })
            .eq("id", generation.id)
          return NextResponse.json({ 
            error: "Freepik server is temporarily unavailable. Please try again later.",
            retryable: true,
          }, { status: 503 })
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    if (!response || !response.ok) {
      await supabase
        .from("generations")
        .update({ status: "failed", metadata: { error: responseText.substring(0, 500) } })
        .eq("id", generation.id)

      return NextResponse.json({ 
        error: `Freepik API error: ${response?.status || "unknown"}`,
        details: responseText.substring(0, 200)
      }, { status: response?.status || 500 })
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      return NextResponse.json({ error: "Invalid response from Freepik" }, { status: 500 })
    }

    // Freepik returns a task ID - we need to poll for completion
    // Response format: { data: { task_id: "...", status: "CREATED" } }
    const taskId = data.data?.task_id || data.task_id || data.data?.id || data.id
    
    
    
    if (!taskId) {
      console.error("[v0] No task ID in response:", JSON.stringify(data))
      return NextResponse.json({ error: "No task ID returned", response: data }, { status: 500 })
    }

    // Determine actual type and model slug used
    const actualType = isImageToVideo ? "image-to-video" : "text-to-video"
    const actualModelSlug = isImageToVideo 
      ? (model.includes("kling-2.5") ? "kling-v2-5-pro" : "kling-o1-pro")
      : (model.includes("1080") ? "wan-v2-6-1080p" : "wan-v2-6-720p")

    // Update generation with task ID and actual type/model
    await supabase
      .from("generations")
      .update({ 
        metadata: { 
          ...generation.metadata, 
          freepik_task_id: taskId,
          model,
          duration,
          actualType,
          actualModelSlug,
        } 
      })
      .eq("id", generation.id)

    // Poll for completion - limited attempts to avoid Vercel timeout (10s on Hobby plan)
    // After 4 attempts (8 seconds), return task ID for client-side polling
    let videoUrl: string | null = null
    let pollAttempts = 0
    const maxPollAttempts = 4 // 4 attempts x 2 seconds = 8 seconds (under 10s limit)

    // Determine the correct status endpoint based on model and type
    let statusEndpoint: string
    if (isImageToVideo) {
      // Kling 2.5 Pro: GET /v1/ai/image-to-video/kling-v2-5-pro/{task_id}
      // Kling O1: GET /v1/ai/image-to-video/kling-o1/{task_id}
      if (model.includes("kling-2.5")) {
        statusEndpoint = `${FREEPIK_API_URL}/image-to-video/kling-v2-5-pro/${taskId}`
      } else {
        statusEndpoint = `${FREEPIK_API_URL}/image-to-video/kling-o1/${taskId}`
      }
    } else {
      const modelSlug = model.includes("1080") ? "wan-v2-6-1080p" : "wan-v2-6-720p"
      statusEndpoint = `${FREEPIK_API_URL}/text-to-video/${modelSlug}/${taskId}`
    }
    
    

    while (!videoUrl && pollAttempts < maxPollAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      pollAttempts++
      
      try {
        const statusResponse = await fetch(statusEndpoint, {
          headers: {
            "x-freepik-api-key": FREEPIK_API_KEY,
          },
        })

        // Skip this poll if 500 error and continue
        if (statusResponse.status === 500) {
          continue
        }

        if (statusResponse.ok) {
          const statusText = await statusResponse.text()
          
          // Check if HTML error page
          if (statusText.includes("<!DOCTYPE") || statusText.includes("<html")) {
            continue // Skip and try next poll
          }
          
          const statusData = JSON.parse(statusText)
          const status = statusData.data?.status || statusData.status

          if (status === "COMPLETED") {
            // Try multiple possible paths for video URL
            // Note: generated is an array of URL strings, NOT objects
            if (statusData.data?.generated?.length > 0) {
              const firstGen = statusData.data.generated[0]
              videoUrl = typeof firstGen === "string" ? firstGen : firstGen?.url
            } else {
              videoUrl = statusData.data?.video?.url || statusData.data?.result?.url
            }
            
            break
          } else if (status === "FAILED") {
            await supabase
              .from("generations")
              .update({ status: "failed" })
              .eq("id", generation.id)
            
            return NextResponse.json({ error: "Video generation failed" }, { status: 500 })
          }
        }
      } catch {
        // Network error - continue to next poll attempt
        continue
      }
    }

    if (!videoUrl) {
      // Still processing - return task ID for client to poll
      // Include actual type and model used (may differ from requested if Kling without image)
      const actualType = isImageToVideo ? "image-to-video" : "text-to-video"
      const actualModelSlug = isImageToVideo 
        ? (model.includes("kling-2.5") ? "kling-v2-5-pro" : "kling-o1-pro")
        : (model.includes("1080") ? "wan-v2-6-1080p" : "wan-v2-6-720p")
      
      return NextResponse.json({
        success: true,
        status: "processing",
        taskId,
        generationId: generation.id,
        actualType, // The actual type used for this task
        actualModelSlug, // The actual model slug for polling
        message: "Video is being generated. Check status with task ID.",
      })
    }

    // Upload video to Supabase storage for permanent storage
    const permanentVideoUrl = await uploadVideoToSupabase(videoUrl, user.id)
    
    // Update generation with permanent video URL
    await supabase
      .from("generations")
      .update({
        status: "completed",
        result_url: permanentVideoUrl,
        completed_at: new Date().toISOString(),
        metadata: {
          model,
          duration,
          freepik_task_id: taskId,
          original_freepik_url: videoUrl,
        },
      })
      .eq("id", generation.id)

    // Deduct credits
    if (profile.role !== "admin") {
      await supabase
        .from("profiles")
        .update({ credits: profile.credits - creditCost })
        .eq("id", user.id)
    }

    return NextResponse.json({
      success: true,
      video_url: permanentVideoUrl,
      generationId: generation.id,
      model,
      duration,
      credits_used: creditCost,
    })

  } catch (error) {
    console.error("[v0] Freepik video error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

// GET endpoint to check task status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("taskId")
    const model = searchParams.get("model") || "wan-v2-6-720p"
    const type = searchParams.get("type") || "text-to-video" // text-to-video or image-to-video

    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 })
    }

    if (!FREEPIK_API_KEY) {
      return NextResponse.json({ error: "Freepik API key not configured" }, { status: 500 })
    }

    // Determine endpoint based on type
    let statusEndpoint: string
    if (type === "image-to-video") {
      // Kling 2.5 Pro: GET /v1/ai/image-to-video/kling-v2-5-pro/{task_id}
      // Kling O1: GET /v1/ai/image-to-video/kling-o1/{task_id}
      if (model.includes("kling-v2-5") || model.includes("kling-2.5")) {
        statusEndpoint = `${FREEPIK_API_URL}/image-to-video/kling-v2-5-pro/${taskId}`
      } else if (model.includes("kling-o1") || model === "kling-o1-pro") {
        statusEndpoint = `${FREEPIK_API_URL}/image-to-video/kling-o1/${taskId}`
      } else {
        statusEndpoint = `${FREEPIK_API_URL}/image-to-video/${model}/${taskId}`
      }
    } else {
      statusEndpoint = `${FREEPIK_API_URL}/text-to-video/${model}/${taskId}`
    }
    
    
    
    // Retry logic for temporary 500 errors
    let response: Response | null = null
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        response = await fetch(statusEndpoint, {
          headers: {
            "x-freepik-api-key": FREEPIK_API_KEY,
          },
        })
        
        // If 500 error, retry after delay
        if (response.status === 500 && retryCount < maxRetries - 1) {
          retryCount++
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        break
      } catch (fetchError) {
        retryCount++
        if (retryCount >= maxRetries) {
          return NextResponse.json({ 
            status: "IN_PROGRESS", 
            retry: true 
          })
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Handle 404 "Task not found" - might be using wrong endpoint type, try fallback
    if (response?.status === 404 && type === "image-to-video") {
      // Try text-to-video endpoint as fallback (task may have been created without image)
      const fallbackModel = model.includes("1080") ? "wan-v2-6-1080p" : "wan-v2-6-720p"
      const fallbackEndpoint = `${FREEPIK_API_URL}/text-to-video/${fallbackModel}/${taskId}`
      
      try {
        const fallbackResponse = await fetch(fallbackEndpoint, {
          headers: { "x-freepik-api-key": FREEPIK_API_KEY },
        })
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          return NextResponse.json(fallbackData.data || fallbackData)
        }
      } catch {
        // Fallback failed, continue to return retry
      }
      
      // If fallback also failed, return retry to keep client polling
      return NextResponse.json({ 
        status: "IN_PROGRESS", 
        retry: true 
      })
    }

    // Handle 500 or non-ok responses - return IN_PROGRESS to allow client to continue polling
    if (!response || !response.ok) {
      // If 500 error persists after retries, still let client retry
      return NextResponse.json({ 
        status: "IN_PROGRESS", 
        retry: true,
        message: "Freepik server is temporarily busy, retrying..."
      })
    }

    // Check if response is HTML (error page) instead of JSON
    const contentType = response.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      return NextResponse.json({ 
        status: "IN_PROGRESS", 
        retry: true 
      })
    }

    const data = await response.json()
    
    // Log full response structure to find video URL
    
    
    const status = data.data?.status || data.status
    
    // Extract video URL from multiple possible paths
    // Freepik returns: { data: { generated: ["https://..."], status: "COMPLETED" } }
    // Note: generated is an array of URL strings, NOT objects with .url property
    let videoUrl = null
    
    if (data.data?.generated && Array.isArray(data.data.generated) && data.data.generated.length > 0) {
      // generated is array of strings (URLs directly)
      const firstGenerated = data.data.generated[0]
      videoUrl = typeof firstGenerated === "string" ? firstGenerated : firstGenerated?.url
      
    } else if (data.data?.video?.url) {
      videoUrl = data.data.video.url
    } else if (data.data?.result?.url) {
      videoUrl = data.data.result.url
    } else if (data.generated?.[0]) {
      const firstGen = data.generated[0]
      videoUrl = typeof firstGen === "string" ? firstGen : firstGen?.url
    }
    
    
    
    return NextResponse.json({
      status,
      video_url: videoUrl,
      progress: data.data?.progress,
      generated: data.data?.generated,
    })

  } catch (error) {
    console.error("[v0] Freepik status check error:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
