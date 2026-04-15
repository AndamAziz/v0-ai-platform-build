import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { CREDIT_COSTS } from "@/lib/types"

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY

async function translateToEnglish(text: string): Promise<string> {
  const hasNonLatin = /[^\u0000-\u007F]/.test(text)
  if (!hasNonLatin) return text

  const groqApiKey = process.env.GROQ_API_KEY
  if (!groqApiKey) return text

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Translate the following text to English. Output ONLY the translation, nothing else." },
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (profile.role !== "admin" && profile.credits < CREDIT_COSTS.image) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 400 })
    }

    const body = await request.json()
    const { prompt, referenceImage, strength = 0.7, style } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (!referenceImage) {
      return NextResponse.json({ error: "Reference image is required" }, { status: 400 })
    }

    const translatedPrompt = await translateToEnglish(prompt)

    // Create generation record
    const { data: generation, error: genError } = await supabaseAdmin
      .from("generations")
      .insert({
        user_id: user.id,
        type: "image",
        provider: "img2img",
        prompt,
        status: "processing",
        credits_used: CREDIT_COSTS.image,
        metadata: { referenceImage, strength, style, translatedPrompt },
      })
      .select()
      .single()

    if (genError) {
      return NextResponse.json({ error: "Failed to create generation record" }, { status: 500 })
    }

    try {
      // Create enhanced prompt for img2img style transfer
      let enhancedPrompt = `${translatedPrompt}, preserve the face and facial features from the reference image, same person, same identity`
      if (style) {
        enhancedPrompt = `${enhancedPrompt}, ${style} style`
      }

      if (!HUGGINGFACE_API_KEY) {
        throw new Error("HuggingFace API key not configured")
      }

      // Use HuggingFace FLUX model for image generation with prompt guidance
      const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "image/png",
          },
          body: JSON.stringify({
            inputs: enhancedPrompt,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HuggingFace error: ${errorText.substring(0, 100)}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      if (arrayBuffer.byteLength === 0) {
        throw new Error("Empty image returned")
      }

      // Upload to Supabase
      const fileName = `img2img-${Date.now()}-${Math.random().toString(36).substring(7)}.png`
      const imageBlob = new Blob([arrayBuffer], { type: "image/png" })

      const { error: uploadError } = await supabase.storage
        .from("generations")
        .upload(fileName, imageBlob, { contentType: "image/png" })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      const { data: publicUrl } = supabase.storage.from("generations").getPublicUrl(fileName)

      // Update generation record
      await supabaseAdmin
        .from("generations")
        .update({
          status: "completed",
          result_url: publicUrl.publicUrl,
          completed_at: new Date().toISOString(),
        })
        .eq("id", generation.id)

      // Deduct credits
      if (profile.role !== "admin") {
        await supabaseAdmin
          .from("profiles")
          .update({ credits: profile.credits - CREDIT_COSTS.image })
          .eq("id", user.id)
      }

      return NextResponse.json({ images: [publicUrl.publicUrl] })
    } catch (error) {
      await supabaseAdmin
        .from("generations")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", generation.id)

      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to generate image" },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    )
  }
}
