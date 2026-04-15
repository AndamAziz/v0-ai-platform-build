import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const VPS2_API_URL = "https://image.pluschannel.co.uk/api/image/text"
const VPS2_API_KEY = process.env.VPS2_API_KEY || "sk_OWsfT0hW35Fo2Wjfs_2T-lrYF4kEnHeZbcC9dSbDz1w"

// Start VPS2 job - returns immediately with job ID
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, width = 512, height = 512, style, negativePrompt } = body

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    // Create job record
    const jobId = `vps2-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const { error: insertError } = await supabase.from("vps2_jobs").insert({
      id: jobId,
      user_id: user.id,
      prompt,
      width,
      height,
      style,
      negative_prompt: negativePrompt,
      status: "pending",
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("[v0] VPS2 job insert error:", insertError)
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 })
    }

    // Start background generation (fire and forget)
    // Note: This won't complete in serverless, we need webhook from VPS
    startBackgroundGeneration(jobId, prompt, width, height, style, negativePrompt, user.id)

    return NextResponse.json({
      jobId,
      status: "pending",
      message: "Image generation started. Poll /api/image/vps2-status?jobId=" + jobId,
    })
  } catch (error) {
    console.error("[v0] VPS2 start error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// This function starts but won't complete in serverless - VPS needs to call webhook
async function startBackgroundGeneration(
  jobId: string,
  prompt: string,
  width: number,
  height: number,
  style: string | undefined,
  negativePrompt: string | undefined,
  userId: string
) {
  try {
    // Call VPS2 API
    const response = await fetch(VPS2_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": VPS2_API_KEY,
      },
      body: JSON.stringify({
        prompt,
        width,
        height,
        num_inference_steps: 50,
        guidance_scale: 8.5,
        job_id: jobId, // VPS will use this to call webhook
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.image_url) {
        // Update job with result
        const { createClient } = await import("@/lib/supabase/server")
        const supabase = await createClient()
        
        const fullUrl = data.image_url.startsWith("http")
          ? data.image_url
          : `https://image.pluschannel.co.uk${data.image_url}`

        await supabase.from("vps2_jobs").update({
          status: "completed",
          image_url: fullUrl,
          completed_at: new Date().toISOString(),
        }).eq("id", jobId)
      }
    }
  } catch (error) {
    console.error("[v0] VPS2 background generation error:", error)
  }
}
