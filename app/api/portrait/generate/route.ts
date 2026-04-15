import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get profile for credits check
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check credits (admins have unlimited)
    if (profile.role !== "admin" && profile.credits < 5) {
      return NextResponse.json({ error: "Insufficient credits. Portrait editing costs 5 credits." }, { status: 403 })
    }

    const { image, mimeType, prompt } = await request.json()

    if (!image || !mimeType || !prompt) {
      return NextResponse.json({ error: "Missing required fields: image, mimeType, prompt" }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured. Please add GEMINI_API_KEY or GOOGLE_API_KEY in Vars." },
        { status: 500 }
      )
    }

    // Call Gemini 2.5 Flash Image Preview
    const result = await generateWithGemini(image, mimeType, prompt)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Deduct credits (admins are exempt)
    if (profile.role !== "admin") {
      await supabase
        .from("profiles")
        .update({ credits: profile.credits - 5 })
        .eq("id", user.id)
    }

    return NextResponse.json({ image: result.image })
  } catch (error) {
    console.error("[Portrait] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

async function generateWithGemini(
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<{ success: boolean; image?: string; error?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  }

  const maxRetries = 3
  const delays = [1000, 2000, 4000]

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Portrait] Attempt ${attempt + 1}/${maxRetries}`)

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || `API Error: ${response.status}`
        console.error(`[Portrait] API error:`, errorMessage)

        // Don't retry on auth errors
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: "API authentication failed. Check your GEMINI_API_KEY." }
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Check for safety blocks
      if (data.promptFeedback?.blockReason) {
        return { success: false, error: `Generation blocked: ${data.promptFeedback.blockReason}` }
      }

      // Extract image from response
      const candidates = data.candidates
      if (!candidates || candidates.length === 0) {
        throw new Error("No candidates returned from API")
      }

      const parts = candidates[0].content?.parts || []
      const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData)

      if (!imagePart || !imagePart.inlineData) {
        // Check if there's text explaining why no image was generated
        const textPart = parts.find((p: { text?: string }) => p.text)
        if (textPart?.text) {
          console.log("[Portrait] API returned text instead of image:", textPart.text)
        }
        throw new Error("No image data in response")
      }

      const resultImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
      console.log("[Portrait] Successfully generated image")

      return { success: true, image: resultImage }
    } catch (error) {
      console.warn(`[Portrait] Attempt ${attempt + 1} failed:`, error)

      if (attempt === maxRetries - 1) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to generate image after multiple attempts",
        }
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
    }
  }

  return { success: false, error: "Failed to generate image" }
}
