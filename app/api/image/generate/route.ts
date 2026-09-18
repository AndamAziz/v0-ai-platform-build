import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { CREDIT_COSTS } from "@/lib/types"

// Max timeout for Vercel Hobby plan (60 seconds)
export const maxDuration = 60
export const dynamic = "force-dynamic"

const HUGGINGFACE_API_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY
// VPS and VPS2 both use Flask API with Pollinations (fast, no logo)
const VPS_API_URL = "https://image.pluschannel.co.uk/api/generate-image"
const VPS_API_KEY = process.env.VPS_API_KEY || "test_key_123"
const VPS2_API_URL = "https://image.pluschannel.co.uk/api/generate-image"
const VPS2_API_KEY = process.env.VPS2_API_KEY || "test_key_123"
const FREEPIK_API_URL = "https://api.freepik.com/v1/ai/text-to-image"
const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY
const POLLINATIONS_API_URL = "https://image.pollinations.ai/prompt"
const CRAIYON_API_URL = "https://api.craiyon.com/v1/generate" // Declared CRAIYON_API_URL

async function translateToEnglish(text: string): Promise<string> {
  const hasNonLatin = /[^\u0000-\u007F]/.test(text)

  if (!hasNonLatin) {
    return text
  }

  const groqApiKey = process.env.GROQ_API_KEY
  if (!groqApiKey) {
    return text
  }

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
          {
            role: "system",
            content: "Translate the following text to English. Output ONLY the translation, nothing else.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      return text
    }

    const data = await response.json()
    const translation = data.choices?.[0]?.message?.content?.trim()

    if (translation && /[a-zA-Z]/.test(translation)) {
      console.log("[v0] Translated:", text.substring(0, 50), "->", translation.substring(0, 50))
      return translation
    }

    return text
  } catch {
    return text
  }
}

async function generateWithPollinations(prompt: string, size: string, style?: string): Promise<string[]> {
  console.log("[v0] Starting Pollinations generation with prompt:", prompt.substring(0, 50))
  
  const [width, height] = size.split("x").map(Number)
  const finalWidth = width || 1024
  const finalHeight = height || 1024
  
  // Add style to prompt
  let enhancedPrompt = prompt
  if (style && style !== "photographic") {
    const styleEnhancements: Record<string, string> = {
      "digital-art": ", digital art style, vibrant colors, detailed illustration",
      "anime": ", anime style, japanese animation art, manga aesthetic",
      "cinematic": ", cinematic style, dramatic lighting, film quality, movie scene",
      "fantasy-art": ", fantasy art style, magical, ethereal, mystical atmosphere",
      "3d-model": ", 3D rendered style, realistic textures, CGI quality, octane render",
    }
    enhancedPrompt = prompt + (styleEnhancements[style] || `, ${style} style`)
  }
  
  // Pollinations uses URL-based generation
  // Try turbo model first (faster, more reliable), fallback to flux
  const encodedPrompt = encodeURIComponent(enhancedPrompt)
  const imageUrl = `${POLLINATIONS_API_URL}/${encodedPrompt}?width=${finalWidth}&height=${finalHeight}&model=turbo&nologo=true&seed=${Date.now()}`
  
  console.log("[v0] Pollinations URL:", imageUrl)
  
  // URLs to try (turbo first, then flux as fallback)
  const urlsToTry = [
    imageUrl,
    `${POLLINATIONS_API_URL}/${encodedPrompt}?width=${finalWidth}&height=${finalHeight}&model=flux&nologo=true&seed=${Date.now() + 1}`,
  ]
  
  let response: Response | null = null
  let lastError: Error | null = null
  
  for (const tryUrl of urlsToTry) {
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        console.log(`[v0] Trying Pollinations URL (attempt ${retryCount + 1}):`, tryUrl.substring(0, 100))
        
                response = await fetch(tryUrl, {
          method: "GET",
          signal: AbortSignal.timeout(20000),
          headers: {
            "Accept": "image/png,image/jpeg,image/*",
            ...(process.env.POLLINATIONS_TOKEN
              ? { Authorization: `Bearer ${process.env.POLLINATIONS_TOKEN}` }
              : {}),
          },
        })
        
        if (response.ok) {
          console.log("[v0] Pollinations success!")
          break
        }
        
        // Retry on 502, 503, 504 errors
        if ([502, 503, 504].includes(response.status)) {
          console.log(`[v0] Pollinations ${response.status} error, retrying... (${retryCount + 1}/${maxRetries})`)
          retryCount++
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 3000 * retryCount))
            continue
          }
        }
        
        lastError = new Error(`Pollinations: ${response.status}`)
        break
      } catch (fetchError) {
        lastError = fetchError as Error
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`[v0] Pollinations fetch error, retrying... (${retryCount}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 3000 * retryCount))
        }
      }
    }
    
    if (response?.ok) break
  }
  
  if (!response || !response.ok) {
    console.log("[v0] Pollinations failed, trying Craiyon fallback...")
    
    // Fallback to Craiyon
    try {
      const craiyonResponse = await fetch("https://api.craiyon.com/v3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          version: "c4ue22fb7kb6wlac",
          negative_prompt: "blurry, bad quality, distorted",
        }),
      })
      
      if (craiyonResponse.ok) {
        const craiyonData = await craiyonResponse.json()
        if (craiyonData.images && craiyonData.images.length > 0) {
          // Craiyon returns base64 images
          const base64Image = craiyonData.images[0]
          const imageDataUrl = `data:image/webp;base64,${base64Image}`
          console.log("[v0] Craiyon fallback success!")
          return [imageDataUrl]
        }
      }
    } catch (craiyonError) {
      console.error("[v0] Craiyon fallback also failed:", craiyonError)
    }
    
    // Try Stable Horde as last resort (free, community-powered)
    console.log("[v0] Trying Stable Horde fallback...")
    try {
      const hordeResponse = await fetch("https://stablehorde.net/api/v2/generate/async", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "0000000000", // Anonymous key
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          params: {
            width: Math.min(finalWidth, 512),
            height: Math.min(finalHeight, 512),
            steps: 20,
            cfg_scale: 7,
          },
          nsfw: false,
          trusted_workers: false,
          slow_workers: true,
        }),
      })
      
      if (hordeResponse.ok) {
        const hordeData = await hordeResponse.json()
        const jobId = hordeData.id
        
        // Poll for result (max 60 seconds)
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          const statusResponse = await fetch(`https://stablehorde.net/api/v2/generate/status/${jobId}`)
          const statusData = await statusResponse.json()
          
          if (statusData.done && statusData.generations?.length > 0) {
            const imageUrl = statusData.generations[0].img
            console.log("[v0] Stable Horde success!")
            return [imageUrl]
          }
          
          if (statusData.faulted) {
            break
          }
        }
      }
    } catch (hordeError) {
      console.error("[v0] Stable Horde fallback also failed:", hordeError)
    }
    
    throw new Error("Image generation servers are busy. Please try again in a few minutes.")
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
        provider: model || "huggingface",
        prompt,
        status: "processing",
        credits_used: CREDIT_COSTS.image,
        metadata: { size, style, negativePrompt, translatedPrompt },
      })
      .select()
      .single()

    if (genError) {
      console.error("[v0] Insert error:", genError)
      return NextResponse.json({ error: "Failed to create generation record" }, { status: 500 })
    }

    let images: string[] = []

    try {
      console.log("[v0] Starting image generation with model:", model || "flux")

      if (model === "pollinations") {
        images = await generateWithPollinations(translatedPrompt, size || "1024x1024", style)
      } else if (model === "freepik") {
        images = await generateWithFreepik(translatedPrompt, size || "512x512", style, negativePrompt)
      } else if (model === "vps2") {
        // VPS2 - Try to generate, return helpful error if timeout
        try {
          images = await generateWithVPS2(translatedPrompt, size || "512x512", style, negativePrompt, user.id)
        } catch (vps2Error) {
          const errorMsg = vps2Error instanceof Error ? vps2Error.message : "Unknown error"
          console.error("[v0] VPS2 error:", errorMsg)
          // Return specific error for VPS2 timeout
          if (errorMsg.includes("fetch") || errorMsg.includes("timeout") || errorMsg.includes("connect")) {
            throw new Error("VPS2 is generating your image (takes 4-5 minutes on CPU). The platform timeout is 60 seconds. Please try again or use a faster provider like Pollinations or HuggingFace.")
          }
          throw vps2Error
        }
      } else if (model === "vps") {
        images = await generateWithVPS(translatedPrompt, size || "512x512", style, negativePrompt)
      } else {
        images = await generateWithHuggingFace(translatedPrompt, size || "512x512", style, negativePrompt)
      }

      console.log("[v0] Generation complete, images:", images.length)

      const { error: updateError } = await supabaseAdmin
        .from("generations")
        .update({
          status: "completed",
          result_url: images[0],
          completed_at: new Date().toISOString(),
        })
        .eq("id", generation.id)

      if (updateError) {
        console.error("[v0] Database update error:", updateError)
      }

      if (profile.role !== "admin") {
        await supabaseAdmin
          .from("profiles")
          .update({ credits: profile.credits - CREDIT_COSTS.image })
          .eq("id", user.id)
      }

      return NextResponse.json({ images })
    } catch (error) {
      console.error("[v0] Generation error:", error)

      await supabaseAdmin
        .from("generations")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", generation.id)

      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to generate image" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Request error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 },
    )
  }
}

async function generateWithHuggingFace(
  prompt: string,
  size: string,
  style?: string,
  negativePrompt?: string,
  userId?: string,
): Promise<string[]> {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error("HuggingFace API key not configured. Please add HUGGINGFACE_API_KEY in Vars.")
  }

  let enhancedPrompt = prompt
  if (style && style !== "photographic") {
    enhancedPrompt = `${prompt}, ${style} style`
  }
  if (negativePrompt) {
    enhancedPrompt = `${enhancedPrompt}. Avoid: ${negativePrompt}`
  }

  console.log("[v0] Calling HuggingFace API...")

  let response: Response
  try {
    response = await fetch(HUGGINGFACE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({
        inputs: enhancedPrompt,
      }),
    })
  } catch (fetchError) {
    console.error("[v0] HuggingFace fetch error:", fetchError)
    throw new Error("HuggingFace: Failed to connect. Check your internet connection.")
  }

  console.log("[v0] HuggingFace response status:", response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] HuggingFace API error:", errorText)
    return await generateWithHuggingFaceFallback(enhancedPrompt)
  }

  const arrayBuffer = await response.arrayBuffer()

  if (arrayBuffer.byteLength === 0) {
    throw new Error("HuggingFace: Returned empty image. Try again.")
  }

  console.log("[v0] Image size:", arrayBuffer.byteLength, "bytes")

  const supabase = await createClient()
  const fileName = `ai-image-${Date.now()}-${Math.random().toString(36).substring(7)}.png`

  const imageBlob = new Blob([arrayBuffer], { type: "image/png" })

  const { error: uploadError } = await supabase.storage.from("generations").upload(fileName, imageBlob, {
    contentType: "image/png",
    upsert: false,
  })

  if (uploadError) {
    console.error("[v0] Upload error:", uploadError)
    throw new Error(`HuggingFace: Failed to upload image - ${uploadError.message}`)
  }

  const { data: publicUrl } = supabase.storage.from("generations").getPublicUrl(fileName)

  console.log("[v0] Generated image URL:", publicUrl.publicUrl)
  return [publicUrl.publicUrl]
}

async function generateWithHuggingFaceFallback(prompt: string): Promise<string[]> {
  const fallbackUrl = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0"

  console.log("[v0] Trying fallback model: Stable Diffusion XL")

  let response: Response
  try {
    response = await fetch(fallbackUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({
        inputs: prompt,
      }),
    })
  } catch (fetchError) {
    console.error("[v0] Fallback fetch error:", fetchError)
    throw new Error("HuggingFace: Failed to connect to fallback model.")
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HuggingFace error: ${response.status} - ${errorText.substring(0, 100)}`)
  }

  const arrayBuffer = await response.arrayBuffer()

  if (arrayBuffer.byteLength === 0) {
    throw new Error("HuggingFace: Returned empty image")
  }

  const supabase = await createClient()
  const fileName = `ai-image-${Date.now()}-${Math.random().toString(36).substring(7)}.png`

  const imageBlob = new Blob([arrayBuffer], { type: "image/png" })
  const { error: uploadError } = await supabase.storage.from("generations").upload(fileName, imageBlob, {
    contentType: "image/png",
    upsert: false,
  })

  if (uploadError) {
    throw new Error(`HuggingFace: Failed to upload image - ${uploadError.message}`)
  }

  const { data: publicUrl } = supabase.storage.from("generations").getPublicUrl(fileName)
  console.log("[v0] Generated image URL:", publicUrl.publicUrl)
  return [publicUrl.publicUrl]
}

async function generateWithVPS(
  prompt: string,
  size: string,
  style?: string,
  negativePrompt?: string,
): Promise<string[]> {
  if (!VPS_API_KEY) {
    throw new Error("VPS: API key not configured. Please add CUSTOM_API_KEY in Vars.")
  }

  const [width, height] = size ? size.split("x").map(Number) : [512, 512]

  let enhancedPrompt = prompt
  if (style && style !== "photographic") {
    enhancedPrompt = `${prompt}, ${style} style`
  }
  if (negativePrompt) {
    enhancedPrompt = `${enhancedPrompt}. Avoid: ${negativePrompt}`
  }

  console.log("[v0] Calling VPS API (Flask + Pollinations)...")

  let response: Response
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

    response = await fetch(VPS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VPS_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        style: style || "photographic",
        remove_logo: true,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
  } catch (fetchError) {
    console.error("[v0] VPS fetch failed:", fetchError)
    throw new Error("VPS: Failed to connect. Server may be down or unreachable.")
  }

  console.log("[v0] VPS response status:", response.status)

  const responseText = await response.text()

  if (!response.ok) {
    console.error("[v0] VPS error:", responseText.substring(0, 200))
    throw new Error(`VPS: Server error ${response.status} - ${responseText.substring(0, 100)}`)
  }

  let data: any
  try {
    data = responseText ? JSON.parse(responseText) : {}
  } catch {
    if (responseText.startsWith("http")) {
      return [responseText.trim()]
    }
    console.error("[v0] VPS invalid JSON:", responseText.substring(0, 200))
    throw new Error("VPS: Invalid response from server")
  }

  // Check for direct URL response (Flask API returns full URL)
  const imageUrl = data.image_url || data.url || data.result_url
  if (imageUrl) {
    console.log("[v0] VPS returned image URL:", imageUrl)
    return [imageUrl]
  }

  throw new Error("VPS: No image URL in response")
}

// Smart prompt normalization for VPS2 - detects topic and enhances prompt automatically
function normalizePromptForVPS2(prompt: string, style?: string): { enhancedPrompt: string; autoNegative: string } {
  const lowerPrompt = prompt.toLowerCase()
  
  // Brand/Product detection
  const brandKeywords = [
    "marlboro", "coca cola", "pepsi", "nike", "adidas", "apple", "samsung", 
    "gucci", "louis vuitton", "rolex", "ferrari", "lamborghini", "bmw", "mercedes",
    "chanel", "dior", "prada", "versace", "armani", "burberry", "supreme",
    "starbucks", "mcdonalds", "burger king", "kfc", "pizza hut", "dunkin",
    "iphone", "macbook", "playstation", "xbox", "nintendo", "airpods",
    "coca-cola", "red bull", "monster energy", "gatorade", "sprite", "fanta",
    "heineken", "budweiser", "corona", "jack daniels", "johnnie walker",
    "ray-ban", "oakley", "cartier", "tiffany", "swarovski", "pandora"
  ]
  
  // Person/Portrait detection
  const personKeywords = ["person", "man", "woman", "girl", "boy", "portrait", "face", "model", "people", "human", "child", "kid", "baby", "elderly", "old man", "old woman", "selfie", "headshot"]
  
  // Animal detection
  const animalKeywords = ["cat", "dog", "bird", "horse", "lion", "tiger", "elephant", "bear", "wolf", "fox", "rabbit", "deer", "eagle", "owl", "snake", "fish", "dolphin", "whale", "monkey", "gorilla", "panda", "koala", "penguin", "parrot", "hamster", "guinea pig", "turtle", "frog", "butterfly", "bee"]
  
  // Nature/Landscape detection
  const natureKeywords = ["mountain", "forest", "ocean", "beach", "sunset", "sunrise", "sky", "nature", "landscape", "river", "lake", "waterfall", "desert", "jungle", "valley", "canyon", "aurora", "northern lights", "stars", "moon", "clouds", "rain", "snow", "storm", "rainbow"]
  
  // Food detection
  const foodKeywords = ["food", "dish", "meal", "pizza", "burger", "sushi", "cake", "coffee", "drink", "fruit", "vegetable", "pasta", "steak", "chicken", "salad", "dessert", "ice cream", "chocolate", "bread", "sandwich", "soup", "rice", "noodles", "tacos", "burrito"]
  
  // Vehicle detection
  const vehicleKeywords = ["car", "motorcycle", "bike", "truck", "plane", "helicopter", "boat", "ship", "train", "bus", "taxi", "ambulance", "police car", "fire truck", "sports car", "suv", "sedan", "convertible", "vintage car", "classic car", "racing car", "jet", "yacht", "submarine"]
  
  // Architecture/Building detection
  const architectureKeywords = ["building", "house", "castle", "tower", "bridge", "city", "skyscraper", "architecture", "mansion", "palace", "temple", "church", "mosque", "cathedral", "museum", "stadium", "airport", "hotel", "restaurant", "office", "factory", "warehouse", "barn", "cottage", "villa"]
  
  // Technology detection
  const techKeywords = ["robot", "ai", "computer", "laptop", "phone", "tablet", "gadget", "technology", "futuristic", "sci-fi", "cyberpunk", "hologram", "virtual reality", "drone", "satellite", "spaceship", "rocket", "space station"]
  
  // Art/Abstract detection
  const artKeywords = ["abstract", "artistic", "painting", "illustration", "drawing", "sketch", "watercolor", "oil painting", "digital art", "concept art", "surreal", "psychedelic", "geometric", "pattern", "texture", "graffiti", "street art", "pop art", "minimalist"]
  
  // Fashion detection
  const fashionKeywords = ["dress", "suit", "jacket", "shirt", "pants", "jeans", "shoes", "boots", "sneakers", "hat", "cap", "sunglasses", "watch", "jewelry", "necklace", "ring", "bracelet", "earrings", "handbag", "purse", "backpack", "scarf", "tie", "belt"]
  
  // Detect categories
  const isBrand = brandKeywords.some(kw => lowerPrompt.includes(kw))
  const wantsPerson = personKeywords.some(kw => lowerPrompt.includes(kw))
  const isAnimal = animalKeywords.some(kw => lowerPrompt.includes(kw))
  const isNature = natureKeywords.some(kw => lowerPrompt.includes(kw))
  const isFood = foodKeywords.some(kw => lowerPrompt.includes(kw))
  const isVehicle = vehicleKeywords.some(kw => lowerPrompt.includes(kw))
  const isArchitecture = architectureKeywords.some(kw => lowerPrompt.includes(kw))
  const isTech = techKeywords.some(kw => lowerPrompt.includes(kw))
  const isArt = artKeywords.some(kw => lowerPrompt.includes(kw))
  const isFashion = fashionKeywords.some(kw => lowerPrompt.includes(kw))
  
  let enhancedPrompt = prompt
  let autoNegative = "blurry, low quality, distorted, ugly, bad composition, watermark, signature, text"
  
  // Apply category-specific enhancements
  if (isBrand && !wantsPerson) {
    enhancedPrompt = `${prompt}, professional product photography, commercial advertisement, studio lighting, high quality product shot, brand logo clearly visible, clean minimal background, marketing photo, 8k resolution, sharp focus`
    autoNegative = `${autoNegative}, people, humans, faces, hands, fingers, body parts`
  } else if (wantsPerson) {
    enhancedPrompt = `${prompt}, professional portrait photography, beautiful lighting, high detail skin texture, sharp focus on eyes and face, symmetrical face, natural facial features, detailed eyes with catchlights, professional photoshoot, perfect face proportions, realistic skin, beautiful face, clear facial details, 8k resolution, masterpiece quality`
    autoNegative = `${autoNegative}, deformed face, distorted face, disfigured face, asymmetric face, bad anatomy, wrong anatomy, extra limbs, missing limbs, bad hands, extra fingers, missing fingers, fused fingers, poorly drawn face, ugly face, mutation, mutated, disgusting, poorly drawn eyes, crossed eyes, unnatural skin, plastic skin, blurry face, low detail face`
  } else if (isAnimal) {
    enhancedPrompt = `${prompt}, wildlife photography, national geographic style, detailed fur and feathers, natural habitat, professional animal photography, sharp focus, beautiful natural lighting, 8k resolution`
    autoNegative = `${autoNegative}, humans, people, cartoon, anime style`
  } else if (isNature) {
    enhancedPrompt = `${prompt}, landscape photography, golden hour lighting, high dynamic range, stunning vista, professional nature photography, vivid colors, 8k resolution, wide angle shot`
    autoNegative = `${autoNegative}, people, humans, buildings, cars, man-made objects`
  } else if (isFood) {
    enhancedPrompt = `${prompt}, food photography, appetizing presentation, professional food styling, soft diffused lighting, delicious looking, culinary art, high resolution, shallow depth of field`
    autoNegative = `${autoNegative}, people, hands, fingers, dirty, messy, unappetizing`
  } else if (isVehicle) {
    enhancedPrompt = `${prompt}, automotive photography, sleek design, professional car photography, dynamic angle, polished finish, dramatic lighting, showroom quality, 8k resolution`
    autoNegative = `${autoNegative}, people, humans, damaged, scratched, dirty`
  } else if (isArchitecture) {
    enhancedPrompt = `${prompt}, architectural photography, dramatic perspective, professional building photography, stunning design, golden hour lighting, symmetrical composition, 8k resolution`
    autoNegative = `${autoNegative}, people, crowds, cars, construction, scaffolding`
  } else if (isTech) {
    enhancedPrompt = `${prompt}, futuristic design, high tech aesthetic, clean lines, glowing elements, sci-fi atmosphere, professional product shot, 8k resolution`
    autoNegative = `${autoNegative}, old, rusty, broken, vintage, retro`
  } else if (isArt) {
    enhancedPrompt = `${prompt}, artistic masterpiece, high detail, professional artwork, stunning composition, vibrant colors, gallery quality`
    autoNegative = `${autoNegative}, amateur, low effort, simple`
  } else if (isFashion) {
    enhancedPrompt = `${prompt}, fashion photography, editorial style, professional lighting, high fashion, vogue style, elegant presentation, 8k resolution`
    autoNegative = `${autoNegative}, wrinkled, dirty, damaged, low quality fabric`
  } else {
    // Generic enhancement
    enhancedPrompt = `${prompt}, high quality, detailed, professional photography, sharp focus, beautiful lighting, 8k resolution`
  }
  
  // Add style-specific enhancements
  if (style) {
    const styleEnhancements: Record<string, string> = {
      "photographic": ", realistic photo, photorealistic, DSLR quality",
      "digital-art": ", digital art style, vibrant colors, detailed illustration",
      "anime": ", anime style, japanese animation art, manga aesthetic, cel shaded",
      "cinematic": ", cinematic style, dramatic lighting, film quality, movie scene, anamorphic",
      "fantasy-art": ", fantasy art style, magical, ethereal, mystical atmosphere, epic",
      "3d-model": ", 3D rendered style, realistic textures, CGI quality, octane render",
    }
    enhancedPrompt += styleEnhancements[style] || ""
  }
  
  return { enhancedPrompt, autoNegative }
}

async function generateWithVPS2(
  prompt: string,
  size: string,
  style?: string,
  negativePrompt?: string,
  userId?: string,
): Promise<string[]> {
  if (!VPS2_API_KEY) {
    throw new Error("VPS2: API key not configured. Please add VPS2_API_KEY in Vars.")
  }

  const [width, height] = size ? size.split("x").map(Number) : [512, 512]

  // Apply smart prompt normalization
  const { enhancedPrompt, autoNegative } = normalizePromptForVPS2(prompt, style)
  const finalNegativePrompt = negativePrompt || autoNegative
  
  console.log("[v0] VPS2 original prompt:", prompt)
  console.log("[v0] VPS2 enhanced prompt:", enhancedPrompt.substring(0, 150) + "...")

  const styleMap: Record<string, string> = {
    photographic: "photo",
    "digital-art": "digital",
    anime: "anime",
    cinematic: "photo",
    "fantasy-art": "digital",
    "3d-model": "digital",
  }

  console.log("[v0] Calling VPS2 API...")

  const maxRetries = 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`[v0] VPS2 retry attempt ${attempt}/${maxRetries}, waiting 15s...`)
      await new Promise((resolve) => setTimeout(resolve, 15000))
    }

    let response: Response
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

// Use Flask API with Pollinations (fast, no logo)
  response = await fetch(VPS2_API_URL, {
  method: "POST",
  headers: {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${VPS2_API_KEY}`,
  },
  body: JSON.stringify({
  prompt: enhancedPrompt,
  style: style || "photographic",
  remove_logo: true,
  }),
  signal: controller.signal,
  })
      clearTimeout(timeoutId)
    } catch (fetchError) {
      console.error("[v0] VPS2 fetch error:", fetchError)
      lastError = new Error("VPS2: Cannot connect to server. Make sure: 1) VPS is running 2) API service is started 3) Port 8000 is open")
      continue
    }

    console.log("[v0] VPS2 response status:", response.status)
    const contentType = response.headers.get("content-type") || ""
    console.log("[v0] VPS2 content-type:", contentType)

    if (response.status === 500 || response.status === 502 || response.status === 503) {
      console.log("[v0] VPS2 server error, will retry...")
      const errorText = await response.text()
      lastError = new Error(`VPS2: Server error (${response.status}). Retrying...`)
      continue
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] VPS2 error response:", errorText.substring(0, 200))
      lastError = new Error(`VPS2: Server error ${response.status} - ${errorText.substring(0, 100)}`)
      continue
    }

    // Check if response is an image (binary)
    if (contentType.includes("image/")) {
      console.log("[v0] VPS2 returned image directly, uploading to Supabase...")
      const imageBuffer = await response.arrayBuffer()
      
      if (imageBuffer.byteLength === 0) {
        lastError = new Error("VPS2: Server returned empty image")
        continue
      }
      
      console.log("[v0] VPS2 image size:", imageBuffer.byteLength, "bytes")
      
      // Upload to Supabase
      const supabase = await createClient()
      const fileName = `vps2-image-${Date.now()}-${Math.random().toString(36).substring(7)}.png`
      const imageBlob = new Blob([imageBuffer], { type: contentType })
      
      const { error: uploadError } = await supabase.storage.from("generations").upload(fileName, imageBlob, {
        contentType: contentType,
        upsert: false,
      })
      
      if (uploadError) {
        console.error("[v0] VPS2 upload error:", uploadError)
        throw new Error("VPS2: Failed to save image")
      }
      
      const { data: publicUrl } = supabase.storage.from("generations").getPublicUrl(fileName)
      console.log("[v0] VPS2 image uploaded:", publicUrl.publicUrl)
      return [publicUrl.publicUrl]
    }

    // Handle JSON response
    const responseText = await response.text()
    console.log("[v0] VPS2 response length:", responseText.length)

    if (!responseText || responseText.trim() === "") {
      console.error("[v0] VPS2 returned empty response")
      lastError = new Error("VPS2: Server returned empty response. Try again.")
      continue
    }

    let data: {
      success?: boolean
      base64_image?: string
      image?: string
      base64?: string
      message?: string
      error?: string
      image_url?: string
      url?: string
      result_url?: string
    }

    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[v0] VPS2 JSON parse error, response:", responseText.substring(0, 200))
      lastError = new Error("VPS2: Invalid response from server")
      continue
    }

    console.log("[v0] VPS2 success:", data.success, "message:", data.message)

    if (data.error) {
      throw new Error(`VPS2: ${data.error}`)
    }

    // Check for direct URL response (Pollinations returns full URL)
    // Endpoint returns: { status: "success", image_url: "https://image.pollinations.ai/..." }
    const imageUrl = data.image_url || data.url || data.result_url
    if (imageUrl) {
      console.log("[v0] VPS2 returned image URL:", imageUrl)
      return [imageUrl]
    }

    // Fallback to base64 image handling
    const base64Image = data.base64_image || data.image || data.base64

    if (!base64Image) {
      console.error("[v0] VPS2 no image in response:", Object.keys(data))
      lastError = new Error("VPS2: No image in response")
      continue
    }

    console.log("[v0] VPS2 base64 image length:", base64Image.length)

    const imageBuffer = Buffer.from(base64Image, "base64")
    const supabase = await createClient()
    const fileName = `vps2-image-${Date.now()}-${Math.random().toString(36).substring(7)}.png`

    const imageBlob = new Blob([imageBuffer], { type: "image/png" })
    const { error: uploadError } = await supabase.storage.from("generations").upload(fileName, imageBlob, {
      contentType: "image/png",
      upsert: false,
    })

    if (uploadError) {
      console.error("[v0] VPS2 upload error:", uploadError)
      throw new Error(`VPS2: Failed to upload - ${uploadError.message}`)
    }

    const { data: publicUrl } = supabase.storage.from("generations").getPublicUrl(fileName)
    console.log("[v0] VPS2 image uploaded to:", publicUrl.publicUrl)

    return [publicUrl.publicUrl]
  }

  throw lastError || new Error("VPS2: Failed after multiple retries")
}

async function generateWithFreepik(
  prompt: string,
  size: string,
  style?: string,
  negativePrompt?: string,
): Promise<string[]> {
  if (!FREEPIK_API_KEY) {
    throw new Error("Freepik: API key not configured. Please add FREEPIK_API_KEY in Vars.")
  }

  let freepikSize = "square_1_1"
  if (size === "1024x1024" || size === "512x512" || size === "768x768") {
    freepikSize = "square_1_1"
  } else if (size === "1024x768" || size === "768x512") {
    freepikSize = "classic_4_3"
  } else if (size === "768x1024" || size === "512x768") {
    freepikSize = "traditional_3_4"
  }

  let freepikStyle: string | undefined
  if (style) {
    const styleMap: Record<string, string> = {
      photographic: "photo",
      "digital-art": "digital-art",
      anime: "anime",
      cinematic: "cinematic",
      "fantasy-art": "fantasy",
      "3d-model": "3d",
    }
    freepikStyle = styleMap[style] || "photo"
  }

  console.log("[v0] Calling Freepik API with style:", freepikStyle)

  let response: Response
  try {
    response = await fetch(FREEPIK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-freepik-api-key": FREEPIK_API_KEY,
      },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: negativePrompt || "blurry, low quality, distorted, ugly",
        guidance_scale: 1.5,
        num_images: 1,
        image: {
          size: freepikSize,
        },
        styling: freepikStyle ? { style: freepikStyle } : undefined,
        filter_nsfw: true,
      }),
    })
  } catch (fetchError) {
    console.error("[v0] Freepik fetch error:", fetchError)
    throw new Error("Freepik: Failed to connect. Check your internet connection.")
  }

  console.log("[v0] Freepik response status:", response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] Freepik API error:", errorText)
    throw new Error(`Freepik: Server error ${response.status} - ${errorText.substring(0, 100)}`)
  }

  let data: {
    data?: Array<{ base64: string; has_nsfw?: boolean }>
    meta?: { prompt: string; seed: number }
  }

  try {
    data = await response.json()
  } catch (parseError) {
    console.error("[v0] Freepik JSON parse error")
    throw new Error("Freepik: Invalid JSON response from server")
  }

  if (!data.data || data.data.length === 0 || !data.data[0].base64) {
    console.error("[v0] Freepik no image in response")
    throw new Error("Freepik: No image in response")
  }

  console.log("[v0] Freepik image received, base64 length:", data.data[0].base64.length)

  const imageBuffer = Buffer.from(data.data[0].base64, "base64")
  const supabase = await createClient()
  const fileName = `freepik-image-${Date.now()}-${Math.random().toString(36).substring(7)}.png`

  const imageBlob = new Blob([imageBuffer], { type: "image/png" })
  const { error: uploadError } = await supabase.storage.from("generations").upload(fileName, imageBlob, {
    contentType: "image/png",
    upsert: false,
  })

  if (uploadError) {
    console.error("[v0] Freepik upload error:", uploadError)
    throw new Error(`Freepik: Failed to upload - ${uploadError.message}`)
  }

  const { data: publicUrl } = supabase.storage.from("generations").getPublicUrl(fileName)
  console.log("[v0] Freepik image uploaded to:", publicUrl.publicUrl)

  return [publicUrl.publicUrl]
}
