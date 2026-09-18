import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { CREDIT_COSTS } from "@/lib/types"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
const GEMINI_IMAGE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent"
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

// Generate image using Gemini (free)
async function generateImageWithGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(`${GEMINI_IMAGE_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Generate a high-quality professional image for a website: ${prompt}. Photorealistic, commercial quality, no text or watermarks.` }]
        }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        }
      }),
    })

    if (!response.ok) {
      console.log("[v0] Gemini image generation failed:", response.status)
      return null
    }

    const data = await response.json()
    const imagePart = data.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData)
    
    if (imagePart?.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
    }
    return null
  } catch (error) {
    console.log("[v0] Gemini image error:", error)
    return null
  }
}

// Extract image placeholders from prompt and generate descriptions
function extractImageNeeds(prompt: string): string[] {
  const needs: string[] = []
  const promptLower = prompt.toLowerCase()
  
  // Detect business type and generate appropriate image prompts
  if (promptLower.includes("restaurant") || promptLower.includes("food") || promptLower.includes("cafe")) {
    needs.push("elegant restaurant interior with warm lighting", "delicious gourmet food dish presentation", "happy customers dining in restaurant")
  } else if (promptLower.includes("fashion") || promptLower.includes("clothing") || promptLower.includes("boutique")) {
    needs.push("stylish fashion clothing display", "elegant fashion model wearing trendy outfit", "luxury boutique store interior")
  } else if (promptLower.includes("tech") || promptLower.includes("software") || promptLower.includes("app")) {
    needs.push("modern tech workspace with computer screens", "team collaborating on software project", "sleek mobile app interface mockup")
  } else if (promptLower.includes("real estate") || promptLower.includes("property") || promptLower.includes("home")) {
    needs.push("beautiful modern house exterior", "luxurious living room interior design", "professional real estate agent with clients")
  } else if (promptLower.includes("beauty") || promptLower.includes("salon") || promptLower.includes("spa")) {
    needs.push("relaxing spa treatment room", "beauty products elegant display", "woman receiving beauty treatment")
  } else if (promptLower.includes("fitness") || promptLower.includes("gym") || promptLower.includes("workout")) {
    needs.push("modern gym equipment and interior", "person doing workout exercise", "healthy lifestyle fitness motivation")
  } else if (promptLower.includes("travel") || promptLower.includes("tour") || promptLower.includes("hotel")) {
    needs.push("beautiful travel destination landscape", "luxury hotel room interior", "happy tourists exploring city")
  } else {
    // Generic business images
    needs.push("professional business team meeting", "modern office workspace")
  }
  
  return needs.slice(0, 3) // Maximum 3 images to avoid long generation times
}

function detectLanguage(text: string): { lang: string; isRTL: boolean; langName: string } {
  const arabicRegex = /[\u0600-\u06FF]/
  const kurdishRegex = /[\u0626\u0628\u067E\u062A-\u062C\u0686\u062D-\u0632\u0698\u0633-\u063A\u0641\u0642\u06A9\u06AF\u0644-\u0648\u06CC]/
  const persianRegex = /[\u06F0-\u06F9]/
  const hebrewRegex = /[\u0590-\u05FF]/

  if (kurdishRegex.test(text) || (arabicRegex.test(text) && text.includes("ک"))) {
    return { lang: "ku", isRTL: true, langName: "Kurdish (Sorani)" }
  }
  if (persianRegex.test(text) || (arabicRegex.test(text) && text.includes("پ"))) {
    return { lang: "fa", isRTL: true, langName: "Persian" }
  }
  if (arabicRegex.test(text)) {
    return { lang: "ar", isRTL: true, langName: "Arabic" }
  }
  if (hebrewRegex.test(text)) {
    return { lang: "he", isRTL: true, langName: "Hebrew" }
  }
  return { lang: "en", isRTL: false, langName: "English" }
}

// 🔥 COMPRESSED system prompt - 60% smaller
function createSystemPrompt(prompt: string, isRTL: boolean, langName: string): string {
  const promptLower = prompt.toLowerCase()
  
  // Auto-detect topic & style
  const configs: Record<string, { style: string; colors: string; pageType: string }> = {
    florist: { style: "minimal", colors: "pastel pink/cream", pageType: "ecommerce" },
    automotive: { style: "bold", colors: "dark/gold", pageType: "ecommerce" },
    fashion: { style: "minimal", colors: "navy-white", pageType: "ecommerce" },
    food: { style: "modern", colors: "warm", pageType: "business" },
    realestate: { style: "corporate", colors: "blue-white", pageType: "ecommerce" },
    technology: { style: "modern", colors: "blue-purple", pageType: "landing" },
    beauty: { style: "minimal", colors: "pastel", pageType: "business" },
    fitness: { style: "bold", colors: "dark/orange", pageType: "business" },
    travel: { style: "creative", colors: "blue", pageType: "business" },
    wedding: { style: "minimal", colors: "pastel/gold", pageType: "portfolio" },
  }

  let detected = { style: "modern", colors: "blue-purple", pageType: "landing" }
  for (const [key, config] of Object.entries(configs)) {
    if (promptLower.includes(key)) {
      detected = config
      break
    }
  }

  return `You are a professional web designer. Create a website from this description:
"${prompt}"

CRITICAL RULES:
1. Return ONLY raw HTML code - NO markdown, NO code blocks, NO explanations
2. Start with <!DOCTYPE html>
3. Use Tailwind CSS (cdn.tailwindcss.com)
4. ALL text in ${langName}
5. Add dir="rtl" if RTL needed
6. Real content only (prices, names, descriptions)
7. Mobile responsive (sm:, md:, lg:)
8. Modern design: rounded-2xl, hover effects, shadows, gradients

DESIGN BRIEF:
- Style: ${detected.style}
- Colors: ${detected.colors}
- Layout: ${detected.pageType}

KEY ELEMENTS (choose based on business type):
- Hero section with compelling headline
- Product/service showcase (if applicable)
- Call-to-action buttons
- Contact/booking section
- Testimonials (if applicable)
- Mobile-first responsive design

For images use these placeholder markers that will be replaced with AI-generated images:
- {{AI_IMAGE_1}} for hero/main image
- {{AI_IMAGE_2}} for secondary image  
- {{AI_IMAGE_3}} for additional image
Or use Unsplash: https://images.unsplash.com/photo-[ID]?w=800&h=600&fit=crop

CREATE NOW.`
}

async function generateWithProvider(
  prompt: string,
  systemPrompt: string,
  provider: string,
  apiKey: string
): Promise<string> {
  if (provider === "openai") {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create this website: ${prompt}` },
        ],
        max_tokens: 8000,
        temperature: 0.7,
      }),
    })
    if (!response.ok) throw new Error(`OpenAI: ${response.status}`)
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ""
  }

  if (provider === "gemini") {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${prompt}` }] }],
        generationConfig: { maxOutputTokens: 8000, temperature: 0.7 },
      }),
    })
    if (!response.ok) throw new Error(`Gemini: ${response.status}`)
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  }

  if (provider === "groq") {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create this website: ${prompt}` },
        ],
        max_tokens: 8000,
        temperature: 0.7,
      }),
    })
    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Groq: ${response.status} - ${errText.substring(0, 100)}`)
    }
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ""
  }

  if (provider === "openrouter") {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create: ${prompt}` },
        ],
        max_tokens: 5000,
        temperature: 0.7,
      }),
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`OpenRouter: ${response.status}`)
    const data = JSON.parse(text)
    return data.choices?.[0]?.message?.content || ""
  }

  throw new Error(`Unknown provider: ${provider}`)
}

function cleanHtml(html: string): string {
  if (!html) return ""
  let cleaned = html.trim()
  cleaned = cleaned.replace(/```html\s*/gi, "").replace(/```\s*/gi, "")
  
  const start = cleaned.toLowerCase().indexOf("<!doctype")
  const end = cleaned.toLowerCase().lastIndexOf("</html>")
  
  if (start >= 0 && end > start) {
    return cleaned.substring(start, end + 7)
  }
  return cleaned
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

    const cost = CREDIT_COSTS.website
    if (profile.role !== "admin" && (profile.credits || 0) < cost) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    const { prompt, provider = "auto" } = await request.json()
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 })
    }

    const { isRTL, langName } = detectLanguage(prompt)
    const systemPrompt = createSystemPrompt(prompt, isRTL, langName)

    const providers = {
      openai: process.env.OPENAI_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      groq: process.env.GROQ_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
    }

    const available = Object.entries(providers)
      .filter(([_, key]) => key)
      .map(([name]) => name)

    if (available.length === 0) {
      return NextResponse.json({ error: "No providers configured" }, { status: 500 })
    }

    // Priority: Groq (fast & free) -> Gemini -> OpenRouter -> OpenAI (rate limited)
    const priorityOrder = ["groq", "gemini", "openrouter", "openai"]
    const tryOrder = provider === "auto" 
      ? available.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b))
      : [provider, ...available.filter((p) => p !== provider)]

    let html = ""
    let usedProvider = ""

    for (const prov of tryOrder) {
      try {
        console.log(`[Generate] Trying ${prov}...`)
        html = await generateWithProvider(prompt, systemPrompt, prov, providers[prov as keyof typeof providers]!)
        if (html && html.toLowerCase().includes("<!doctype")) {
          usedProvider = prov
          break
        }
      } catch (err) {
        console.error(`[Generate] ${prov} failed:`, err)
        continue
      }
    }

    if (!html) {
      return NextResponse.json({ error: "All providers failed" }, { status: 500 })
    }

    let cleanedHtml = cleanHtml(html)
    if (!cleanedHtml.toLowerCase().includes("<!doctype")) {
      return NextResponse.json({ error: "Invalid HTML output" }, { status: 500 })
    }

    // Replace AI image placeholders with generated images
    const imageNeeds = extractImageNeeds(prompt)
    const placeholders = ["{{AI_IMAGE_1}}", "{{AI_IMAGE_2}}", "{{AI_IMAGE_3}}"]
    
    for (let i = 0; i < placeholders.length; i++) {
      if (cleanedHtml.includes(placeholders[i]) && imageNeeds[i]) {
        console.log(`[v0] Generating AI image ${i + 1}: ${imageNeeds[i].substring(0, 50)}...`)
        const imageData = await generateImageWithGemini(imageNeeds[i])
        if (imageData) {
          cleanedHtml = cleanedHtml.replace(placeholders[i], imageData)
          console.log(`[v0] AI image ${i + 1} generated successfully`)
        } else {
          // Fallback to Unsplash placeholder
          const fallbackImages = [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=600&fit=crop"
          ]
          cleanedHtml = cleanedHtml.replace(placeholders[i], fallbackImages[i] || fallbackImages[0])
          console.log(`[v0] AI image ${i + 1} failed, using Unsplash fallback`)
        }
      }
    }

    if (profile.role !== "admin") {
      await supabase
        .from("profiles")
        .update({ credits: Math.max(0, (profile.credits || 0) - cost) })
        .eq("id", user.id)
    }

    await supabase.from("generations").insert({
      user_id: user.id,
      type: "website",
      prompt: prompt.substring(0, 500),
      status: "completed",
      credits_used: cost,
      provider: usedProvider,
      metadata: { language: langName },
    })

    return NextResponse.json({ success: true, code: cleanedHtml, provider: usedProvider })
  } catch (error) {
    console.error("[Generate] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    )
  }
}
