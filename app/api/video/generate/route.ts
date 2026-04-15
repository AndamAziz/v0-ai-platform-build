import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { CREDIT_COSTS } from "@/lib/types"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { handleHuggingFaceVideoGeneration } from "@/lib/video/huggingface"

// VPS2 API URLs - NEW endpoints that run models locally (no HuggingFace dependency)
const VPS2_VIDEO_API_URL = "https://image.pluschannel.co.uk/api/video/text"
const VPS2_IMAGE_API_URL = "https://image.pluschannel.co.uk/api/image/text"

const KURDISH_VOICE_MAP: Record<string, string> = {
  kurdish_sorani_male: "sorani_85",
  kurdish_sorani_female: "sorani_214",
  kurdish_kurmanji_male: "kurmanji_6",
  kurdish_kurmanji_female: "kurmanji_12",
}

const DEFAULT_PRESENTER_URL = "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg"

function getAdminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
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

    const body = await request.json()
    const {
      mode = "talking",
      prompt,
      script,
      aspectRatio,
      imageUrl,
      voiceId,
      voiceProvider = "microsoft",
      provider = "d-id",
      audioType,
      voiceText,
      voiceLang,
      voiceGender,
      musicStyle,
      customAudioUrl,
      targetDuration,
      hfModel, // Hugging Face model selection
    } = body

    if (provider === "vps2") {
      return await handleVPS2VideoGeneration(
        supabase,
        user.id,
        profile,
        prompt,
        aspectRatio,
        mode, // "prompt", "image-to-video", or "lipsync"
        imageUrl,
        audioType,
        voiceText,
        voiceLang,
        voiceGender,
        musicStyle,
        customAudioUrl,
        targetDuration,
      )
    }

    if (provider === "huggingface") {
      return await handleHuggingFaceVideoGeneration(
        supabase,
        user.id,
        profile,
        prompt,
        aspectRatio,
        hfModel,
        imageUrl,
      )
    }

    // D-ID provider (original code)
    const didApiKey = process.env.DID_API_KEY
    if (!didApiKey) {
      return NextResponse.json(
        { error: "D-ID API key not configured. Add DID_API_KEY to environment variables." },
        { status: 500 },
      )
    }

    let presenterImageUrl = imageUrl
    let videoUrl: string

    if (mode === "talking" && imageUrl) {
      // Talking mode: user uploaded an image, we make it speak
      if (imageUrl.startsWith("data:image")) {
        try {
          presenterImageUrl = await uploadBase64Image(imageUrl, supabase, user.id)
        } catch (uploadError) {
          console.error("Failed to upload custom image:", uploadError)
          return NextResponse.json({ error: "Failed to upload custom image" }, { status: 500 })
        }
      }

      const spokenText = script
      if (!spokenText) {
        return NextResponse.json({ error: "Script is required for talking video" }, { status: 400 })
      }

      // Create generation record
      const { data: generation, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          type: "video",
          provider: "d-id",
          prompt: spokenText,
          status: "processing",
          credits_used: CREDIT_COSTS.video,
          metadata: {
            mode: "talking",
            aspectRatio,
            imageUrl: presenterImageUrl,
            voiceId,
            voiceProvider,
          },
        })
        .select()
        .single()

      if (genError) {
        return NextResponse.json({ error: "Failed to create generation record" }, { status: 500 })
      }

      try {
        if (voiceProvider === "kurdish") {
          videoUrl = await generateWithKurdishTTS(spokenText, presenterImageUrl, voiceId, didApiKey, supabase, user.id)
        } else {
          videoUrl = await generateWithDID(spokenText, presenterImageUrl, voiceId, didApiKey)
        }

        await supabase
          .from("generations")
          .update({
            status: "completed",
            result_url: videoUrl,
            completed_at: new Date().toISOString(),
          })
          .eq("id", generation.id)

        if (profile.role !== "admin") {
          await supabase
            .from("profiles")
            .update({ credits: profile.credits - CREDIT_COSTS.video })
            .eq("id", user.id)
        }

        return NextResponse.json({ videoUrl })
      } catch (error) {
        await supabase
          .from("generations")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", generation.id)

        throw error
      }
    } else {
      // Prompt mode
      const videoPrompt = prompt
      if (!videoPrompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
      }

      // Create generation record
      const { data: generation, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          type: "video",
          provider: "d-id",
          prompt: videoPrompt,
          status: "processing",
          credits_used: CREDIT_COSTS.video,
          metadata: {
            mode: "prompt",
            aspectRatio,
            voiceId,
            voiceProvider,
          },
        })
        .select()
        .single()

      if (genError) {
        return NextResponse.json({ error: "Failed to create generation record" }, { status: 500 })
      }

      try {
        if (voiceProvider === "kurdish") {
          videoUrl = await generateWithKurdishTTS(
            videoPrompt,
            DEFAULT_PRESENTER_URL,
            voiceId,
            didApiKey,
            supabase,
            user.id,
          )
        } else {
          videoUrl = await generateWithDID(videoPrompt, DEFAULT_PRESENTER_URL, voiceId, didApiKey)
        }

        await supabase
          .from("generations")
          .update({
            status: "completed",
            result_url: videoUrl,
            completed_at: new Date().toISOString(),
          })
          .eq("id", generation.id)

        if (profile.role !== "admin") {
          await supabase
            .from("profiles")
            .update({ credits: profile.credits - CREDIT_COSTS.video })
            .eq("id", user.id)
        }

        return NextResponse.json({ videoUrl })
      } catch (error) {
        await supabase
          .from("generations")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", generation.id)

        throw error
      }
    }
  } catch (error) {
    console.error("Video generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate video" },
      { status: 500 },
    )
  }
}

async function handleVPS2VideoGeneration(
  supabase: any,
  userId: string,
  profile: any,
  prompt: string,
  aspectRatio: string,
  mode?: string, // "prompt", "image-to-video", or "lipsync"
  imageUrl?: string,
  audioType?: string,
  voiceText?: string,
  voiceLang?: string,
  voiceGender?: string,
  musicStyle?: string,
  customAudioUrl?: string,
  targetDuration?: number,
): Promise<NextResponse> {
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required for VPS2 video generation" }, { status: 400 })
  }

  const vps2ApiKey = process.env.VPS2_API_KEY
  if (!vps2ApiKey) {
    return NextResponse.json(
      { error: "VPS2 API key not configured. Add VPS2_API_KEY to environment variables." },
      { status: 500 },
    )
  }

  const kurdishTtsApiKey = process.env.KURDISH_TTS_API_KEY

  // Create generation record
  const { data: generation, error: genError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      type: "video",
      provider: "vps2",
      prompt: prompt,
      status: "processing",
      credits_used: CREDIT_COSTS.video,
      metadata: {
        mode: mode || "prompt",
        aspectRatio,
        provider: "vps2",
        imageUrl,
        audioType,
        voiceText,
        voiceLang,
        voiceGender,
        musicStyle,
        customAudioUrl,
        targetDuration,
      },
    })
    .select()
    .single()

  if (genError) {
    return NextResponse.json({ error: "Failed to create generation record" }, { status: 500 })
  }

  try {
    const videoUrl = await generateVideoWithVPS2(
      prompt,
      aspectRatio,
      vps2ApiKey,
      supabase,
      userId,
      mode,
      imageUrl,
      audioType,
      voiceText,
      voiceLang,
      voiceGender,
      musicStyle,
      customAudioUrl,
      targetDuration,
      kurdishTtsApiKey,
    )

    await supabase
      .from("generations")
      .update({
        status: "completed",
        result_url: videoUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id)

    if (profile.role !== "admin") {
      await supabase
        .from("profiles")
        .update({ credits: profile.credits - CREDIT_COSTS.video })
        .eq("id", userId)
    }

    return NextResponse.json({ videoUrl })
  } catch (error) {
    await supabase
      .from("generations")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", generation.id)

    throw error
  }
}

async function generateVideoWithVPS2(
  prompt: string,
  aspectRatio: string,
  apiKey: string,
  supabase: any,
  userId: string,
  mode?: string,
  imageUrl?: string,
  audioType?: string,
  voiceText?: string,
  voiceLang?: string,
  voiceGender?: string,
  musicStyle?: string,
  customAudioUrl?: string,
  targetDuration?: number,
  kurdishTtsApiKey?: string,
): Promise<string> {
  console.log("[v0] Starting VPS2 video generation - Mode:", mode || "prompt")
  console.log("[v0] Prompt:", prompt?.substring(0, 50))
  console.log("[v0] Audio options:", { audioType, voiceLang, voiceGender, musicStyle, customAudioUrl, targetDuration })

  // Determine dimensions based on aspect ratio - Wan2.1 supported sizes
  let width = 512
  let height = 320
  if (aspectRatio === "16:9") {
    width = 512
    height = 320
  } else if (aspectRatio === "9:16") {
    width = 320
    height = 512
  } else if (aspectRatio === "1:1") {
    width = 384
    height = 384
  }

  const controller = new AbortController()
  // Wan2.1 on CPU takes a LONG time - set 30 minute timeout
  const timeoutId = setTimeout(() => controller.abort(), 1800000)

  try {
    console.log("[v0] VPS2 mode:", mode || "prompt")

    // Determine effect based on duration
    let effect = "zoom"
    if (targetDuration && targetDuration >= 5) {
      effect = "pan_left"
    }

    // Build JSON body for new VPS2 /api/video/text endpoint
    const requestBody: any = {
      prompt: prompt,
      duration: targetDuration || 5,
    }
    
    // Add image URL if provided (for image-to-video mode)
    if (imageUrl) {
      requestBody.image_url = imageUrl
      console.log("[v0] VPS2 with image:", imageUrl.substring(0, 80))
    }
    
    console.log("[v0] VPS2 request body:", JSON.stringify(requestBody))

    const response = await fetch(VPS2_VIDEO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    console.log("[v0] VPS2 video response status:", response.status)

    const responseText = await response.text()
    console.log("[v0] VPS2 video response length:", responseText.length)

    if (!response.ok) {
      console.log("[v0] VPS2 video error:", response.status, responseText.substring(0, 200))
      
      // Parse specific error codes
      if (responseText.includes("HF API error 402") || responseText.includes("402")) {
        throw new Error("VPS2: Server quota exceeded. Please try again later or use Hugging Face provider instead.")
      }
      if (responseText.includes("HF API error 503") || responseText.includes("503")) {
        throw new Error("VPS2: Server is busy. Please try again in a few minutes.")
      }
      if (responseText.includes("timeout") || response.status === 504) {
        throw new Error("VPS2: Request timed out. Try a shorter duration or use D-ID provider.")
      }
      
      throw new Error(`VPS2 video error ${response.status}: ${responseText.substring(0, 200)}`)
    }

    if (!responseText || responseText.length === 0) {
      throw new Error("VPS2: Empty response. Video generation may have timed out. Try using D-ID provider instead.")
    }

    if (responseText.startsWith("<") || responseText.includes("<!DOCTYPE") || responseText.includes("<html")) {
      throw new Error("VPS2: Server returned error page instead of video data.")
    }

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.log("[v0] VPS2 JSON parse error, response preview:", responseText.substring(0, 200))
      throw new Error(`VPS2: Invalid response format`)
    }

    console.log("[v0] VPS2 video parsed response:", data)

    // New VPS2 endpoint returns video_path (local path on server)
    // We need to construct the full URL
    if (data.video_path) {
      // video_path is like "/root/vps2/videos/xxx.mp4"
      // We need to serve it via the VPS2 server
      const videoFileName = data.video_path.split("/").pop()
      const videoUrl = `https://image.pluschannel.co.uk/videos/${videoFileName}`
      console.log("[v0] VPS2 video URL:", videoUrl)
      return videoUrl
    }

    // Also check for direct URL formats
    if (data.video_url || data.url) {
      const videoUrl = data.video_url || data.url
      console.log("[v0] VPS2 returned direct video URL:", videoUrl)
      return videoUrl
    }

    // Support base64 format (fallback)
    const videoBase64 = data.video || data.base64_video
    if (videoBase64) {
      console.log("[v0] VPS2 video generated, base64 length:", videoBase64.length)

      const binaryString = atob(videoBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const videoBlob = new Blob([bytes], { type: "video/mp4" })
      const fileName = `videos/${userId}/vps2-video-${Date.now()}.mp4`
      const adminClient = getAdminClient()

      console.log("[v0] Uploading video to Supabase:", fileName, "size:", videoBlob.size)

      const { error: uploadError } = await adminClient.storage.from("generations").upload(fileName, videoBlob, {
        contentType: "video/mp4",
        upsert: true,
      })

      if (uploadError) {
        console.log("[v0] Upload error:", uploadError)
        throw new Error(`Failed to upload video: ${uploadError.message}`)
      }

      const { data: publicUrlData } = adminClient.storage.from("generations").getPublicUrl(fileName)
      console.log("[v0] VPS2 video uploaded:", publicUrlData.publicUrl)
      return publicUrlData.publicUrl
    }

    throw new Error(`VPS2: Video generation failed - ${data.detail || data.message || "No video data received"}`)
  } catch (error: any) {
    clearTimeout(timeoutId)
    console.log("[v0] VPS2 video generation error:", error.message)
    if (error.name === "AbortError") {
      throw new Error("VPS2: Video generation timed out. VPS2 is slow on CPU - try D-ID provider for faster results.")
    }
    throw error
  }
}

async function uploadBase64Image(base64Data: string, supabase: any, userId: string): Promise<string> {
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!matches) {
    throw new Error("Invalid base64 image format")
  }

  const extension = matches[1] === "jpeg" ? "jpg" : matches[1]
  const base64Content = matches[2]
  const mimeType = `image/${matches[1]}`

  const binaryString = atob(base64Content)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const blob = new Blob([bytes], { type: mimeType })
  const fileName = `images/${userId}/${Date.now()}.${extension}`

  const { data: uploadData, error: uploadError } = await supabase.storage.from("generations").upload(fileName, blob, {
    contentType: mimeType,
    upsert: true,
  })

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`)
  }

  const { data: publicUrlData } = supabase.storage.from("generations").getPublicUrl(fileName)

  if (!publicUrlData?.publicUrl) {
    throw new Error("Failed to get public URL for uploaded image")
  }

  return publicUrlData.publicUrl
}

async function generateWithKurdishTTS(
  script: string,
  imageUrl: string,
  voiceId: string,
  didApiKey: string,
  supabase: any,
  userId: string,
): Promise<string> {
  const presenterImage = imageUrl || DEFAULT_PRESENTER_URL

  const kurdishTtsApiKey = process.env.KURDISH_TTS_API_KEY
  if (!kurdishTtsApiKey) {
    throw new Error("Kurdish TTS API key not configured. Add KURDISH_TTS_API_KEY to environment variables.")
  }

  const ttsVoice = KURDISH_VOICE_MAP[voiceId] || "sorani_85"

  const ttsResponse = await fetch("https://www.kurdishtts.com/api/tts-proxy", {
    method: "POST",
    headers: {
      "x-api-key": kurdishTtsApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: script,
      speaker_id: ttsVoice,
    }),
  })

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text().catch(() => "Unknown error")
    throw new Error(`Kurdish TTS API error: ${errorText}`)
  }

  const contentType = ttsResponse.headers.get("content-type") || ""
  let audioUrl: string

  if (contentType.includes("application/json")) {
    const ttsData = await ttsResponse.json()
    audioUrl = ttsData.audio_url || ttsData.audioUrl || ttsData.url || ttsData.audio

    if (!audioUrl) {
      throw new Error("Failed to get audio URL from Kurdish TTS API response")
    }
  } else {
    const audioBuffer = await ttsResponse.arrayBuffer()
    const fileName = `audio/${userId}/${Date.now()}.mp3`

    const { error: uploadError } = await supabase.storage.from("generations").upload(fileName, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    })

    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`)
    }

    const { data: publicUrlData } = supabase.storage.from("generations").getPublicUrl(fileName)
    audioUrl = publicUrlData.publicUrl

    if (!audioUrl) {
      throw new Error("Failed to get public URL for uploaded audio")
    }
  }

  const didPayload = {
    source_url: presenterImage,
    script: {
      type: "audio",
      audio_url: audioUrl,
    },
    config: {
      fluent: false, // Disable fluent mode to prevent zoom
      pad_audio: 0.5,
      stitch: true, // Keep image as is without cropping
    },
    driver_url: "bank://lively", // Use lively driver for natural movement without zoom
  }

  const createResponse = await fetch("https://api.d-id.com/talks", {
    method: "POST",
    headers: {
      Authorization: `Basic ${didApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(didPayload),
  })

  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    let errorData: any = {}
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { description: errorText }
    }
    throw new Error(`D-ID API error: ${errorData.message || errorData.description || createResponse.statusText}`)
  }

  const createData = await createResponse.json()
  const talkId = createData.id

  if (!talkId) {
    throw new Error("Failed to get talk ID from D-ID")
  }

  return await pollDIDTalk(talkId, didApiKey)
}

async function generateWithDID(
  script: string,
  imageUrl: string,
  voiceId: string | undefined,
  apiKey: string,
): Promise<string> {
  const presenterImage = imageUrl || DEFAULT_PRESENTER_URL
  const voice = voiceId || "en-US-JennyNeural"

  const createResponse = await fetch("https://api.d-id.com/talks", {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_url: presenterImage,
      script: {
        type: "text",
        input: script,
        provider: {
          type: "microsoft",
          voice_id: voice,
        },
      },
      config: {
        fluent: false, // Disable fluent mode to prevent zoom
        pad_audio: 0.5,
        stitch: true, // Keep image as is without cropping
      },
      driver_url: "bank://lively", // Use lively driver for natural movement without zoom
    }),
  })

  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    let errorData: any = {}
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { description: errorText }
    }
    throw new Error(`D-ID API error: ${errorData.message || errorData.description || createResponse.statusText}`)
  }

  const createData = await createResponse.json()
  const talkId = createData.id

  if (!talkId) {
    throw new Error("Failed to get talk ID from D-ID")
  }

  return await pollDIDTalk(talkId, apiKey)
}

async function pollDIDTalk(talkId: string, apiKey: string): Promise<string> {
  const maxAttempts = 60
  let attempts = 0

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(`https://api.d-id.com/talks/${talkId}`, {
      headers: {
        Authorization: `Basic ${apiKey}`,
      },
    })

    if (!statusResponse.ok) {
      throw new Error("Failed to check D-ID talk status")
    }

    const status = await statusResponse.json()

    if (status.status === "done") {
      if (status.result_url) {
        return status.result_url
      }
      throw new Error("Video URL not found in D-ID response")
    }

    if (status.status === "error" || status.status === "rejected") {
      throw new Error(status.error?.message || "D-ID video generation failed")
    }

    await new Promise((resolve) => setTimeout(resolve, 5000))
    attempts++
  }

  throw new Error("D-ID video generation timed out")
}
