import { createClient } from "@/lib/supabase/server"

const POLLINATIONS_API_URL = "https://image.pollinations.ai/prompt"

// Pollinations AI - Free, no API key required
export async function generateWithPollinations(prompt: string, size: string): Promise<string[]> {
  console.log("[v0] Starting Pollinations generation with prompt:", prompt.substring(0, 50))
  
  const [width, height] = size.split("x").map(Number)
  const finalWidth = width || 1024
  const finalHeight = height || 1024
  
  // Pollinations uses URL-based generation
  const encodedPrompt = encodeURIComponent(prompt)
  const imageUrl = `${POLLINATIONS_API_URL}/${encodedPrompt}?width=${finalWidth}&height=${finalHeight}&model=flux&nologo=true&seed=${Date.now()}`
  
  console.log("[v0] Pollinations URL:", imageUrl)
  
  // Fetch the image to verify it works and upload to Supabase
  const response = await fetch(imageUrl, {
    method: "GET",
    headers: {
      "Accept": "image/png,image/jpeg,image/*",
    },
  })
  
  if (!response.ok) {
    console.error("[v0] Pollinations error:", response.status)
    throw new Error(`Pollinations: Failed to generate image - ${response.status}`)
  }
  
  const imageBuffer = await response.arrayBuffer()
  console.log("[v0] Pollinations image received, size:", imageBuffer.byteLength)
  
  // Upload to Supabase for persistent storage
  const supabase = await createClient()
  const fileName = `pollinations-image-${Date.now()}-${Math.random().toString(36).substring(7)}.png`
  
  const imageBlob = new Blob([imageBuffer], { type: "image/png" })
  const { error: uploadError } = await supabase.storage.from("generations").upload(fileName, imageBlob, {
    contentType: "image/png",
    upsert: false,
  })
  
  if (uploadError) {
    console.error("[v0] Pollinations upload error:", uploadError)
    // Fallback to direct URL if upload fails
    return [imageUrl]
  }
  
  const { data: publicUrl } = supabase.storage.from("generations").getPublicUrl(fileName)
  console.log("[v0] Pollinations image uploaded to:", publicUrl.publicUrl)
  
  return [publicUrl.publicUrl]
}
