import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60 // Maximum allowed timeout for Vercel

const SPACE_URL = "https://dream2589632147-dream-wan2-2-faster-pro.hf.space"

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Parse FormData from request
    const form = await req.formData()
    const file = form.get("input_image") as File | null
    const prompt = form.get("prompt")?.toString() || ""
    const negativePrompt = form.get("negative_prompt")?.toString() || ""
    const durationSeconds = parseFloat(form.get("duration_seconds")?.toString() || "3.5")
    const guidanceScale = parseFloat(form.get("guidance_scale")?.toString() || "1.0")
    const guidanceScale2 = parseFloat(form.get("guidance_scale_2")?.toString() || "1.0")
    const steps = parseInt(form.get("steps")?.toString() || "6")
    const seed = parseInt(form.get("seed")?.toString() || "42")
    const randomizeSeed = form.get("randomize_seed")?.toString() !== "false"

    if (!file) {
      return new Response("input_image is required", { status: 400 })
    }

    console.log("[v0] Wan22 - File:", file.size, "bytes, Type:", file.type)
    console.log("[v0] Wan22 - Prompt:", prompt.substring(0, 60))

    // Step 1: Upload the image file to the Space first
    const uploadFormData = new FormData()
    uploadFormData.append("files", file, file.name || "input.png")
    
    console.log("[v0] Uploading image to Space...")
    const uploadResponse = await fetch(`${SPACE_URL}/gradio_api/upload`, {
      method: "POST",
      body: uploadFormData,
    })
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.log("[v0] Upload failed:", uploadResponse.status, errorText.substring(0, 200))
      return new Response(`Upload failed: ${uploadResponse.status}`, { status: 500 })
    }
    
    const uploadResult = await uploadResponse.json()
    console.log("[v0] Upload result:", JSON.stringify(uploadResult).substring(0, 200))
    
    // The upload returns an array of file paths like ["/path/to/file.png"]
    const uploadedPath = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult
    
    // Create the image file reference in Gradio FileData format
    const imageRef = {
      path: uploadedPath,
      url: `${SPACE_URL}/gradio_api/file=${uploadedPath}`,
      orig_name: file.name || "input.png",
      mime_type: file.type || "image/png",
      is_stream: false,
      meta: { _type: "gradio.FileData" }
    }
    
    console.log("[v0] Image ref:", JSON.stringify(imageRef).substring(0, 150))

    // Step 2: Use /queue/join to submit the job (Gradio sse_v3 protocol)
    const sessionHash = Math.random().toString(36).substring(2, 15)
    
    // From Space /config: generate_video has dependency id: 0, inputs: [5,6,12,9,7,13,14,10,11]
    // Order: image(5), prompt(6), steps(12), neg_prompt(9), duration(7), guidance(13), guidance2(14), seed(10), randomize(11)
    const queuePayload = {
      data: [
        imageRef,           // component 5 - ImageData
        prompt,             // component 6 - prompt
        steps,              // component 12 - inference steps  
        negativePrompt,     // component 9 - negative prompt
        durationSeconds,    // component 7 - duration seconds
        guidanceScale,      // component 13 - guidance_scale
        guidanceScale2,     // component 14 - guidance_scale_2
        seed,               // component 10 - seed
        randomizeSeed,      // component 11 - randomize_seed
      ],
      fn_index: 0,  // generate_video dependency id is 0, NOT 3
      session_hash: sessionHash,
    }
    
    console.log("[v0] Joining queue with session:", sessionHash)
    console.log("[v0] Payload data length:", queuePayload.data.length)
    
    // Use /queue/join for sse_v3 protocol
    const queueResponse = await fetch(`${SPACE_URL}/gradio_api/queue/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queuePayload),
    })
    
    if (!queueResponse.ok) {
      const errorText = await queueResponse.text()
      console.log("[v0] Queue join failed:", queueResponse.status, errorText.substring(0, 300))
      return new Response(`Queue join failed: ${queueResponse.status} - ${errorText.substring(0, 100)}`, { status: 500 })
    }
    
    const queueResult = await queueResponse.json()
    console.log("[v0] Queue result:", JSON.stringify(queueResult).substring(0, 200))
    
    // Step 3: Poll /queue/data with session_hash for SSE events
    console.log("[v0] Polling /queue/data for results...")
    
    let videoUrl = ""
    const maxWaitMs = 4 * 60 * 1000 // 4 minutes
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitMs) {
      const resultResponse = await fetch(`${SPACE_URL}/gradio_api/queue/data?session_hash=${sessionHash}`, {
        headers: { "Accept": "text/event-stream" },
      })
      
      if (!resultResponse.ok) {
        console.log("[v0] SSE fetch error:", resultResponse.status)
        await new Promise(r => setTimeout(r, 3000))
        continue
      }
      
      const resultText = await resultResponse.text()
      console.log("[v0] SSE response:", resultText.substring(0, 300))
      
      // Parse SSE events - look for process_completed or error
      const lines = resultText.split("\n")
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // Check for data lines with JSON
        if (line.startsWith("data: ")) {
          const dataStr = line.substring(6).trim()
          if (!dataStr || dataStr === "null") continue
          
          try {
            const event = JSON.parse(dataStr)
            console.log("[v0] SSE event msg:", event.msg)
            
            // Handle process_completed - this contains the final output
            if (event.msg === "process_completed" && event.output?.data) {
              console.log("[v0] Process completed! Output:", JSON.stringify(event.output).substring(0, 300))
              const outputData = event.output.data
              
              // Look for video in output array
              if (Array.isArray(outputData)) {
                for (const item of outputData) {
                  if (item?.url && (item.url.includes(".mp4") || item.mime_type?.includes("video"))) {
                    videoUrl = item.url
                    console.log("[v0] Found video URL:", videoUrl.substring(0, 100))
                    break
                  }
                  if (item?.path && (item.path.includes(".mp4") || item.path.includes("tmp"))) {
                    videoUrl = `${SPACE_URL}/gradio_api/file=${item.path}`
                    console.log("[v0] Found video path:", item.path)
                    break
                  }
                }
              }
              break
            }
            
            // Handle error
            if (event.msg === "process_completed" && event.output?.error) {
              const errorMsg = event.output.error
              console.log("[v0] Process error:", errorMsg)
              if (errorMsg.includes("GPU") || errorMsg.includes("quota") || errorMsg.includes("duration")) {
                return new Response("GPU limit exceeded - try again later", { status: 503 })
              }
              return new Response(`Generation error: ${errorMsg}`, { status: 500 })
            }
            
            // Handle estimation (still in queue)
            if (event.msg === "estimation") {
              console.log("[v0] Queue position:", event.rank, "ETA:", event.queue_eta)
            }
            
            // Handle progress updates
            if (event.msg === "progress" || event.msg === "heartbeat") {
              console.log("[v0] Progress/heartbeat received, continuing...")
            }
            
          } catch (e) {
            // Not valid JSON, skip
          }
        }
      }
      
      if (videoUrl) break
      
      // Wait before next poll
      await new Promise(r => setTimeout(r, 2000))
    }
    
    if (!videoUrl) {
      console.log("[v0] Timeout waiting for video")
      return new Response("Timeout waiting for video generation", { status: 504 })
    }
    
    console.log("[v0] Video URL:", videoUrl.substring(0, 100))

    // Step 4: Download the video and return it
    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      return new Response(`Failed to fetch video: ${videoResponse.status}`, { status: 500 })
    }

    const videoBlob = await videoResponse.arrayBuffer()
    console.log("[v0] Video downloaded, size:", videoBlob.byteLength)

    return new Response(videoBlob, {
      status: 200,
      headers: { 
        "Content-Type": "video/mp4",
        "Content-Length": videoBlob.byteLength.toString(),
      },
    })
  } catch (error: any) {
    console.error("[v0] Wan22 error:", error.message)
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
