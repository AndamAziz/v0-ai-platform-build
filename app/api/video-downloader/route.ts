import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Cobalt v10 API instances - POST to root "/" endpoint
// v7 API (/api/json) was shut down on Nov 11, 2024
// These are official imput.net instances that work with v10
const COBALT_INSTANCES = [
  "https://kityune.imput.net/",
  "https://sunny.imput.net/",
  "https://nachos.imput.net/",
  "https://blossom.imput.net/",
]

// Supported platforms for video downloading
const SUPPORTED_PLATFORMS = [
  { name: "YouTube", pattern: /(?:youtube\.com|youtu\.be)/ },
  { name: "TikTok", pattern: /tiktok\.com/ },
  { name: "Instagram", pattern: /instagram\.com/ },
  { name: "Twitter/X", pattern: /(?:twitter\.com|x\.com)/ },
  { name: "Reddit", pattern: /reddit\.com/ },
  { name: "Pinterest", pattern: /pinterest\.com/ },
  { name: "Spotify", pattern: /spotify\.com/ },
  { name: "SoundCloud", pattern: /soundcloud\.com/ },
  { name: "Vimeo", pattern: /vimeo\.com/ },
  { name: "Twitch", pattern: /twitch\.tv/ },
  { name: "Tumblr", pattern: /tumblr\.com/ },
  { name: "Bilibili", pattern: /bilibili\.com/ },
  { name: "Facebook", pattern: /facebook\.com/ },
  { name: "Bluesky", pattern: /bsky\.app/ },
  { name: "Snapchat", pattern: /snapchat\.com/ },
  { name: "Dailymotion", pattern: /dailymotion\.com/ },
  { name: "Loom", pattern: /loom\.com/ },
  { name: "Streamable", pattern: /streamable\.com/ },
  { name: "OK.ru", pattern: /ok\.ru/ },
  { name: "VK", pattern: /vk\.com/ },
  { name: "Rutube", pattern: /rutube\.ru/ },
]

function detectPlatform(url: string): string {
  for (const platform of SUPPORTED_PLATFORMS) {
    if (platform.pattern.test(url)) {
      return platform.name
    }
  }
  return "Unknown"
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Build Cobalt v10 API request body
function buildCobaltRequest(url: string, quality: string, audioOnly: boolean) {
  const body: Record<string, unknown> = {
    url,
    videoQuality: quality || "1080",
    audioFormat: "mp3",
    filenameStyle: "basic",
  }
  
  if (audioOnly) {
    body.downloadMode = "audio"
  }
  
  return body
}

// Try Cobalt API instances with timeout
async function tryCobaltDownload(url: string, quality: string, audioOnly: boolean) {
  const requestBody = buildCobaltRequest(url, quality, audioOnly)
  const errors: string[] = []
  
  for (const instance of COBALT_INSTANCES) {
    try {
      // Add 10 second timeout per instance
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch(instance, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      const text = await response.text()
      
      // Skip HTML responses (error pages)
      if (text.startsWith("<!") || text.startsWith("<html")) {
        errors.push(`${instance}: server error`)
        continue
      }
      
      let data
      try {
        data = JSON.parse(text)
      } catch {
        errors.push(`${instance}: invalid response`)
        continue
      }
      
      // Check for success
      if (data.status === "tunnel" || data.status === "redirect") {
        return { success: true, data }
      }
      
      if (data.status === "picker" && data.picker?.length > 0) {
        // Multiple options - pick first video/audio
        const item = audioOnly 
          ? data.picker.find((p: any) => p.type === "audio") || data.picker[0]
          : data.picker.find((p: any) => p.type === "video") || data.picker[0]
        return { success: true, data: { status: "redirect", url: item.url, filename: item.filename } }
      }
      
      // Handle errors
      if (data.error) {
        const errorCode = data.error?.code || data.error
        
        // YouTube-specific errors
        if (errorCode.includes("youtube") || errorCode.includes("fetch.fail")) {
          errors.push(`${instance}: YouTube blocked`)
          continue
        }
        
        // Auth required
        if (errorCode.includes("auth") || errorCode.includes("jwt")) {
          errors.push(`${instance}: auth required`)
          continue
        }
        
        errors.push(`${instance}: ${errorCode}`)
        continue
      }
      
      // Direct URL in response
      if (data.url) {
        return { success: true, data: { status: "redirect", url: data.url, filename: data.filename } }
      }
      
      errors.push(`${instance}: unexpected response`)
    } catch (err: any) {
      if (err.name === "AbortError") {
        errors.push(`${instance}: timeout`)
      } else {
        errors.push(`${instance}: ${err.message || "network error"}`)
      }
    }
  }
  
  // All instances failed - log for debugging
  console.error("All Cobalt instances failed:", errors)
  
  const hasYouTubeError = errors.some(e => e.includes("YouTube"))
  const hasAuthError = errors.some(e => e.includes("auth"))
  const hasTimeout = errors.some(e => e.includes("timeout"))
  
  if (hasYouTubeError) {
    return { 
      success: false, 
      error: "YouTube downloads are currently limited. Please try cobalt.tools directly in your browser.",
      isYouTubeError: true,
      debugInfo: errors,
    }
  }
  
  if (hasAuthError) {
    return { 
      success: false, 
      error: "Download servers require authentication. Please try cobalt.tools directly.",
      isAuthError: true,
      debugInfo: errors,
    }
  }

  if (hasTimeout) {
    return {
      success: false,
      error: "Download servers are slow or unavailable. Please try again later.",
      isTimeout: true,
      debugInfo: errors,
    }
  }
  
  return { 
    success: false, 
    error: "All download servers failed. Please try cobalt.tools directly.",
    debugInfo: errors,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { url, quality = "1080", audioOnly = false, format = "mp4" } = body

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!isValidUrl(url)) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    const platform = detectPlatform(url)
    if (platform === "Unknown") {
      return NextResponse.json(
        { error: "Unsupported platform" },
        { status: 400 }
      )
    }

    // Try to download
    const result = await tryCobaltDownload(url, quality, audioOnly)
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          serviceUnavailable: result.isAuthError,
          isYouTubeError: result.isYouTubeError,
          cobaltLink: "https://cobalt.tools",
          originalUrl: url,
          platform,
        },
        { status: result.isYouTubeError || result.isAuthError ? 503 : 400 }
      )
    }

    const cobaltData = result.data
    const downloadUrl = cobaltData.url
    const filename = cobaltData.filename || `${platform.toLowerCase()}-${Date.now()}.${audioOnly ? "mp3" : format}`

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "Could not get download URL" },
        { status: 400 }
      )
    }

    // Save to history
    await supabase.from("generations").insert({
      user_id: user.id,
      type: "video",
      provider: "download",
      prompt: url,
      status: "completed",
      result_url: downloadUrl,
      credits_used: 0,
      metadata: {
        platform,
        quality,
        format,
        audioOnly,
        filename,
        originalUrl: url,
        isDownload: true,
      },
      completed_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename,
      platform,
      quality,
      format: audioOnly ? "mp3" : format,
    })
  } catch (error) {
    console.error("Video downloader error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

// Get download history
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: downloads, error } = await supabase
      .from("generations")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "video")
      .eq("provider", "download")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: "Failed to fetch downloads" }, { status: 500 })
    }

    return NextResponse.json({ downloads })
  } catch (error) {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
