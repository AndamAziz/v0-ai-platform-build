import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { CREDIT_COSTS } from "@/lib/types"

// Max timeout for Vercel Hobby plan (60 seconds)
export const maxDuration = 60
export const dynamic = "force-dynamic"

const POLLINATIONS_API_URL = "https://image.pollinations.ai/prompt"
const POLLINATIONS_TOKEN = process.env.POLLINATIONS_TOKEN

const HUGGINGFACE_API_URL =
  "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY

const FREEPIK_API_URL = "https://api.freepik.com/v1/ai/text-to-image"
const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY

const STYLE_HINTS: Record<string, string> = {
  "digital-art": ", digital art style, vibrant colors, detailed illustration",
  anime: ", anime style, japanese animation art, manga aesthetic",
  cinematic: ", cinematic style, dramatic lighting, film quality, movie scene",
  "fantasy-art": ", fantasy art style, magical, ethereal, mystical atmosphere",
  "3d-model": ", 3D rendered style, realistic textures, CGI quality, octane render",
}

function applyStyle(prompt: string, style?: string): string {
  if (!style || style === "photographic") return prompt
  return prompt + (STYLE_HINTS[style] || `, ${style} style`)
}

function describeFetchError(err: unknown, provider: string, seconds: number): Error {
  const name = err instanceof Error ? err.name : ""
  if (name === "TimeoutError" || name === "AbortError") {
    return new Error(`${provider} did not answer within ${seconds} seconds. It is busy - please try again.`)
  }
  return new Error(`Could not reach ${provider}: ${err instanceof Error ? err.message : "unknown error"}`)
}

/** Uploads the generated image to Supabase storage and returns its public URL. */
async function uploadToStorage(buffer: ArrayBuffer, prefix: string, fallbackUrl?: string): Promise<string[]> {
  const supabase = await createClient()
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.png`
  const imageBlob = new Blob([buffer], { type: "image/png" })

  const { error: uploadError } = await supabase.storage.from("generations").upload(fileName, imageBlob, {
    contentType: "image/png",
    upsert: false,
  })

  if (uploadError) {
    console.error("[img] Storage upload error:", uploadError.message)
    if (fallbackUrl) return [fallbackUrl]
    throw new Error(`Could not save the image: ${uploadError.message}`)
  }

  const { data: publicUrl } = supabase.storage.from("generations").getPublicUrl(fileName)
  return [publicUrl.publicUrl]
}

/** Translates a non-English prompt to English using Groq. Falls back to the original text. */
async function translateToEnglish(text: string): Promise<string> {
  const hasNonLatin = /[^\u0000-\u007F]/.test(text)
  if (!hasNonLatin) return text

  const groqApiKey = process.env.GROQ_API_KEY
  if (!groqApiKey) return text

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Translate the following text to English. Output ONLY the translation, nothing else.",
          },
          { role: "user", content: text },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    })

    if (!response.ok) return text
    const data = await response.json()
    const translation = data.choices?.[0]?.message?.content?.trim()
    return translation && /[a-zA-Z]/.test(translation) ? translation : text
  } catch {
    return text
  }
}

/** Pollinations - free. A token (POLLINATIONS_TOKEN) raises the rate limit and removes the watermark. */
async function generateWithPollinations(prompt: string, size: string, style?: string): Promise<string[]> {
  const [width, height] = size.split("x").map(Number)
  const finalWidth = width || 1024
  const finalHeight = height || 1024

  const enhancedPrompt = applyStyle(prompt, style)
  const encodedPrompt = encodeURIComponent(enhancedPrompt)
    const seed = Math.floor(Math.random() * 1000000)
  const imageUrl =
    `${POLLINATIONS_API_URL}/${encodedPrompt}` +
    `?width=${finalWidth}&height=${finalHeight}&model=sana&seed=${seed}` +
    (POLLINATIONS_TOKEN ? "&nologo=true" : "")

  console.log("[img] Pollinations request, token present:", Boolean(POLLINATIONS_TOKEN))

  let response: Response
  try {
    response = await fetch(imageUrl, {
      method: "GET",
      signal: AbortSignal.timeout(35000),
      headers: {
        Accept: "image/png,image/jpeg,image/*",
        ...(POLLINATIONS_TOKEN ? { Authorization: `Bearer ${POLLINATIONS_TOKEN}` } : {}),
      },
    })
  } catch (err) {
    throw describeFetchError(err, "Pollinations", 35)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`Pollinations returned ${response.status}. ${detail.slice(0, 200)}`)
  }

  const buffer = await response.arrayBuffer()
  console.log("[img] Pollinations image received:", buffer.byteLength, "bytes")

  if (buffer.byteLength < 1000) {
    throw new Error("Pollinations returned an empty image. Please try again.")
  }

  return uploadToStorage(buffer, "pollinations-image", imageUrl)
}

/** HuggingFace Inference. Note: hf-inference no longer serves every model; errors are surfaced clearly. */
async function generateWithHuggingFace(
  prompt: string,
  style?: string,
  negativePrompt?: string,
): Promise<string[]> {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error("HuggingFace API key not configured. Add HUGGINGFACE_API_KEY in Vercel.")
  }

  let enhancedPrompt = applyStyle(prompt, style)
  if (negativePrompt) {
    enhancedPrompt = `${enhancedPrompt}. Avoid: ${negativePrompt}`
  }

  let response: Response
  try {
    response = await fetch(HUGGINGFACE_API_URL, {
      method: "POST",
      signal: AbortSignal.timeout(40000),
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({ inputs: enhancedPrompt }),
    })
  } catch (err) {
    throw describeFetchError(err, "HuggingFace", 40)
  }

  console.log("[img] HuggingFace response status:", response.status)

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    if (response.status === 410 || response.status === 404) {
      throw new Error(
        "This HuggingFace model is no longer available on the free inference provider. Use Pollinations instead.",
      )
    }
    throw new Error(`HuggingFace error ${response.status}: ${errorText.slice(0, 150)}`)
  }

  const buffer = await response.arrayBuffer()
  if (buffer.byteLength < 1000) {
    throw new Error("HuggingFace returned an empty image. Please try again.")
  }

  return uploadToStorage(buffer, "hf-image")
}

/** Freepik text-to-image. Returns a base64 image which is stored in Supabase. */
async function generateWithFreepik(
  prompt: string,
  size: string,
  style?: string,
  negativePrompt?: string,
): Promise<string[]> {
  if (!FREEPIK_API_KEY) {
    throw new Error("Freepik API key not configured. Add FREEPIK_API_KEY in Vercel.")
  }

  let freepikSize = "square_1_1"
  if (size === "1024x768" || size === "768x512") {
    freepikSize = "classic_4_3"
  } else if (size === "768x1024" || size === "512x768") {
    freepikSize = "traditional_3_4"
  }

  const styleMap: Record<string, string> = {
    photographic: "photo",
    "digital-art": "digital-art",
    anime: "anime",
    cinematic: "cinematic",
    "fantasy-art": "fantasy",
    "3d-model": "3d",
  }
  const freepikStyle = style ? styleMap[style] || "photo" : undefined

  let response: Response
  try {
    response = await fetch(FREEPIK_API_URL, {
      method: "POST",
      signal: AbortSignal.timeout(40000),
      headers: {
        "Content-Type": "application/json",
        "x-freepik-api-key": FREEPIK_API_KEY,
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: negativePrompt || "blurry, low quality, distorted, ugly",
        guidance_scale: 1.5,
        num_images: 1,
        image: { size: freepikSize },
        styling: freepikStyle ? { style: freepikStyle } : undefined,
        filter_nsfw: true,
      }),
    })
  } catch (err) {
    throw describeFetchError(err, "Freepik", 40)
  }

  console.log("[img] Freepik response status:", response.status)

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`Freepik error ${response.status}: ${errorText.slice(0, 150)}`)
  }

  let data: { data?: Array<{ base64: string }> }
  try {
    data = await response.json()
  } catch {
    throw new Error("Freepik returned an invalid response.")
  }

  const base64 = data.data?.[0]?.base64
  if (!base64) {
    throw new Error("Freepik did not return an image.")
  }

  const buffer = Uint8Array.from(Buffer.from(base64, "base64")).buffer as ArrayBuffer
  return uploadToStorage(buffer, "freepik-image")
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

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (profile.role !== "admin" && profile.credits < CREDIT_COSTS.image) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 400 })
    }

    let body: { prompt?: string; model?: string; size?: string; style?: string; negativePrompt?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { prompt, model, size, style, negativePrompt } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const translatedPrompt = await translateToEnglish(prompt)

    const { data: generation, error: genError } = await supabaseAdmin
      .from("generations")
      .insert({
        user_id: user.id,
        type: "image",
        provider: model || "pollinations",
        prompt,
        status: "processing",
        credits_used: CREDIT_COSTS.image,
        metadata: { size, style, negativePrompt, translatedPrompt },
      })
      .select()
      .single()

    if (genError) {
      console.error("[img] Insert error:", genError)
      return NextResponse.json({ error: "Failed to create generation record" }, { status: 500 })
    }

    try {
      console.log("[img] Starting generation with model:", model || "pollinations")

      let images: string[]
      if (model === "freepik") {
        images = await generateWithFreepik(translatedPrompt, size || "512x512", style, negativePrompt)
      } else if (model === "flux" || model === "huggingface") {
        images = await generateWithHuggingFace(translatedPrompt, style, negativePrompt)
      } else {
        // pollinations, vps, vps2 and anything else fall back to Pollinations
        images = await generateWithPollinations(translatedPrompt, size || "1024x1024", style)
      }

      console.log("[img] Generation complete, images:", images.length)

      const { error: updateError } = await supabaseAdmin
        .from("generations")
        .update({
          status: "completed",
          result_url: images[0],
          completed_at: new Date().toISOString(),
        })
        .eq("id", generation.id)

      if (updateError) {
        console.error("[img] Database update error:", updateError)
      }

      if (profile.role !== "admin") {
        await supabaseAdmin
          .from("profiles")
          .update({ credits: profile.credits - CREDIT_COSTS.image })
          .eq("id", user.id)
      }

      return NextResponse.json({ images })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error("[img] Generation error:", message)

      await supabaseAdmin
        .from("generations")
        .update({ status: "failed", error_message: message })
        .eq("id", generation.id)

      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    console.error("[img] Request error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 },
    )
  }
}
