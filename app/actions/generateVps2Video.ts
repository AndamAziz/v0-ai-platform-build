"use server"

export async function generateVps2Video(prompt: string, duration: number = 5, imageUrl?: string) {
  const apiKey = process.env.VPS2_API_KEY
  
  if (!apiKey) {
    throw new Error("VPS2_API_KEY not configured")
  }

  console.log("[VPS2] Generating video - prompt:", prompt, "duration:", duration, "imageUrl:", imageUrl ? "yes" : "no")

  const requestBody: { prompt: string; duration: number; image_url?: string } = {
    prompt: prompt?.trim() || "Video",
    duration: duration,
  }
  
  // Add image URL for Ken Burns effect
  if (imageUrl) {
    requestBody.image_url = imageUrl
  }

  const res = await fetch("https://image.pluschannel.co.uk/api/video/text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
    cache: "no-store",
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error("[VPS2] API Error:", res.status, errorText)
    throw new Error(`VPS2 failed: ${res.status} - ${errorText}`)
  }

  const data = await res.json()
  console.log("[VPS2] Response:", data)

  if (!data.video_path) {
    throw new Error("No video_path in response")
  }

  // Extract filename and build public URL
  const fileName = data.video_path.split("/").pop()
  const videoUrl = `https://image.pluschannel.co.uk/videos/${fileName}`

  console.log("[VPS2] Video URL:", videoUrl)

  return { 
    success: true,
    videoUrl,
    prompt: data.prompt,
  }
}
