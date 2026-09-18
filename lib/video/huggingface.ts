import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { put } from "@vercel/blob"
import { InferenceClient } from "@huggingface/inference" // Import InferenceClient
import { Client } from "@gradio/client"

const CREDIT_COSTS = { video: 100 }

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Hugging Face Gradio Spaces - FREE video generation (tested & working)
export const HF_VIDEO_MODELS = [
  // === TEXT TO VIDEO (FREE) ===
  {
    id: "ltx-video-fast",
    name: "LTX Video (Recommended)",
    description: "Fast text to video - FREE",
    spaceName: "Lightricks/ltx-video-distilled",
    requiresImage: false,
    type: "gradio-space", // Added type field
    model: "ltx-video-fast", // Added model field
  },
  // === IMAGE TO VIDEO (FREE) ===
  {
    id: "dream-wan2-2-faster",
    name: "Wan2.2 Image to Video",
    description: "Convert image to video - FREE",
    spaceName: "dream2589632147/Dream-wan2-2-faster-Pro",
    requiresImage: true,
    type: "gradio-space", // Added type field
    model: "dream-wan2-2-faster", // Added model field
  },
]

// Keep old export for backward compatibility
export const HF_VIDEO_SPACES = HF_VIDEO_MODELS

// Upload base64 image to Vercel Blob using REST API and return public URL
async function uploadImageToBlob(imageBase64: string): Promise<string> {
  const base64Data = imageBase64.split(",")[1]
  const mimeType = imageBase64.split(";")[0].split(":")[1] || "image/png"
  const extension = mimeType.split("/")[1] || "png"
  const filename = `hf-input-${Date.now()}.${extension}`
  
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN not set")
  }
  
  const binaryData = Buffer.from(base64Data, "base64")
  
  // Use Vercel Blob REST API directly (more reliable in server context)
  const response = await fetch(`https://blob.vercel-storage.com/${filename}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${blobToken}`,
      "Content-Type": mimeType,
      "x-content-type": mimeType,
      "x-add-random-suffix": "1",
    },
    body: binaryData,
  })
  
  if (!response.ok) {
    const errText = await response.text()
    console.log("[v0] Blob error:", response.status, errText.substring(0, 100))
    throw new Error(`Blob upload failed: ${response.status}`)
  }
  
  const result = await response.json()
  console.log("[v0] Uploaded to Blob:", result.url)
  return result.url
}

// Hugging Face Video generation using Gradio Spaces (FREE)
export async function handleHuggingFaceVideoGeneration(
  supabase: any,
  userId: string,
  profile: any,
  prompt: string,
  aspectRatio: string,
  hfModelId?: string,
  imageUrl?: string,
): Promise<NextResponse> {
  const selectedModel = HF_VIDEO_MODELS.find(m => m.id === hfModelId) || HF_VIDEO_MODELS[0]
  console.log("[HF-Video] Selected:", selectedModel.name)
  console.log("[HF-Video] Has image:", !!imageUrl, "Prompt:", prompt?.substring(0, 50))

  // Check if image is required but not provided
  if (selectedModel.requiresImage && !imageUrl) {
    return NextResponse.json(
      { error: `${selectedModel.name} requires an image. Please upload an image first.` },
      { status: 400 },
    )
  }

  const hfToken = process.env.HUGGINGFACE_API_KEY
  if (!hfToken) {
    return NextResponse.json(
      { error: "HUGGINGFACE_API_KEY not configured" },
      { status: 500 },
    )
  }

  try {
    let videoUrl = ""
    
    // Use Gradio Spaces (FREE and working)
    console.log("[HF-Video] Using Gradio Space:", selectedModel.spaceName)
      
      // Upload base64 image to blob if needed
      let publicImageUrl = imageUrl
      if (imageUrl?.startsWith("data:")) {
        try {
          publicImageUrl = await uploadImageToBlob(imageUrl)
        } catch (blobErr: any) {
          console.log("[HF-Video] Blob upload failed:", blobErr.message)
        }
      }
      
      const gradioClient = await Client.connect(selectedModel.spaceName!, {
                token: hfToken as `hf_${string}`,
      })
      
      const apiInfo = await gradioClient.view_api()
      const namedEndpoints = apiInfo.named_endpoints || {}
      const endpointNames = Object.keys(namedEndpoints)
      console.log("[HF-Video] Gradio endpoints:", endpointNames)
      
      let result: any = null
      const priorityEndpoints = ["/generate_video", "/predict", "/generate", "/text_to_video", "/image_to_video"]
      const sortedEndpoints = [
        ...priorityEndpoints.filter(e => endpointNames.includes(e)),
        ...endpointNames.filter(e => !priorityEndpoints.includes(e)),
      ]
      
      for (const endpoint of sortedEndpoints) {
        try {
          const endpointInfo = namedEndpoints[endpoint]
          const params = endpointInfo?.parameters || []
          const callParams: Record<string, any> = {}
          
          for (const param of params) {
            const name = param.parameter_name
            const hasDefault = param.parameter_has_default
            
            if (name.includes("image") || name.includes("img") || name === "ref_img") {
              if (publicImageUrl) callParams[name] = publicImageUrl
              else if (!hasDefault) throw new Error(`Requires image: ${name}`)
            } else if (name.includes("prompt") || name.includes("text")) {
              callParams[name] = prompt || ""
            } else if (name === "negative") {
              callParams[name] = ""
            } else if (name === "seed") {
              callParams[name] = Math.floor(Math.random() * 999999)
            } else if (name === "randomize_seed") {
              callParams[name] = true
            } else if (name === "steps" || name === "num_inference_steps") {
              callParams[name] = 4
            } else if (name === "guidance_scale" || name === "cfg") {
              callParams[name] = 5.0
            } else if (name === "num_frames") {
              callParams[name] = 16
            } else if (name === "fps") {
              callParams[name] = 8
            }
          }
          
          result = await gradioClient.predict(endpoint, callParams)
          console.log("[HF-Video] Gradio success:", JSON.stringify(result).substring(0, 200))
          break
        } catch (e: any) {
          console.log("[HF-Video] Endpoint failed:", endpoint, e.message?.substring(0, 100))
          if (e.message?.includes("GPU quota") || e.message?.includes("exceeded") || e.message?.includes("exhausted")) {
            throw new Error("Hugging Face GPU quota exhausted for today. Please use 'VPS2 AI Video (Free)' instead - it has no limits!")
          }
          if (e.message?.includes("is currently loading") || e.message?.includes("loading")) {
            throw new Error("Model is loading, please wait 1-2 minutes and try again.")
          }
          continue
        }
      }
      
      if (!result) throw new Error("No Gradio endpoint worked")
      
      // Extract video URL
    if (result?.data) {
      const data = Array.isArray(result.data) ? result.data[0] : result.data
      videoUrl = typeof data === "string" ? data : data?.url || data?.path || data?.video?.url || ""
    }
    
    if (!videoUrl) {
      throw new Error("Could not get video URL from response")
    }

    console.log("[HF-Video] Final video URL:", videoUrl)

    // Save to database
    const adminClient = getAdminClient()
    const creditCost = Math.floor(CREDIT_COSTS.video / 4) // 25 credits for HF
    
    if (profile.role !== "admin") {
      await adminClient
        .from("profiles")
        .update({ credits: profile.credits - creditCost })
        .eq("id", userId)
    }

    await adminClient.from("generations").insert({
      user_id: userId,
      type: "video",
      prompt,
      result_url: videoUrl,
      provider: "huggingface",
      model: selectedModel.model || selectedModel.spaceName,
      credits_used: profile.role === "admin" ? 0 : creditCost,
    })

    return NextResponse.json({
      videoUrl,
      message: `Video generated with ${selectedModel.name}`,
    })
  } catch (error: any) {
    console.error("[HF-Video] Error:", error.message)
    return NextResponse.json(
      { error: `Video generation failed: ${error.message}` },
      { status: 500 },
    )
  }
}
