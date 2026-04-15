import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { CREDIT_COSTS } from "@/lib/types"

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

    if (profile.role !== "admin" && profile.credits < CREDIT_COSTS.voice) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 400 })
    }

    const body = await request.json()
    const { text, provider, voice, speed } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Create generation record
    const { data: generation, error: genError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        type: "voice",
        provider: provider || "openai",
        prompt: text.substring(0, 500),
        status: "processing",
        credits_used: CREDIT_COSTS.voice,
        metadata: { voice, speed },
      })
      .select()
      .single()

    if (genError) {
      return NextResponse.json({ error: "Failed to create generation record" }, { status: 500 })
    }

    try {
      let audioUrl: string
      if (provider === "kurdish") {
        audioUrl = await generateWithKurdishTTS(text, voice)
      } else {
        audioUrl = await generateWithOpenAI(text, voice, speed)
      }

      await supabase
        .from("generations")
        .update({
          status: "completed",
          result_url: audioUrl,
          completed_at: new Date().toISOString(),
        })
        .eq("id", generation.id)

      if (profile.role !== "admin") {
        await supabase
          .from("profiles")
          .update({ credits: profile.credits - CREDIT_COSTS.voice })
          .eq("id", user.id)
      }

      return NextResponse.json({ audioUrl })
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
  } catch (error) {
    console.error("TTS generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate audio" },
      { status: 500 },
    )
  }
}

async function generateWithKurdishTTS(text: string, voice: string): Promise<string> {
  const apiKey = process.env.KURDISH_TTS_API_KEY
  if (!apiKey) {
    throw new Error("Kurdish TTS API key not configured")
  }

  const response = await fetch("https://www.kurdishtts.com/api/tts-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      speaker_id: voice,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Kurdish TTS API error: ${errorText}`)
  }

  // Check content type to determine response format
  const contentType = response.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    // JSON response with audio URL
    const data = await response.json()
    if (data.audio_url) {
      return data.audio_url
    }
    throw new Error("No audio URL in response")
  } else {
    // Binary audio response - convert to base64
    const audioBuffer = await response.arrayBuffer()
    const bytes = new Uint8Array(audioBuffer)
    let binary = ""
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    return `data:audio/mp3;base64,${base64}`
  }
}

async function generateWithOpenAI(text: string, voice: string, speed: number): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: voice || "alloy",
      speed: speed || 1.0,
      response_format: "mp3",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || "OpenAI TTS API error")
  }

  const audioBuffer = await response.arrayBuffer()
  const bytes = new Uint8Array(audioBuffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return `data:audio/mp3;base64,${base64}`
}
