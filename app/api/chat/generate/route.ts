import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateWithPollinations } from "@/lib/image/pollinations"

// Detect if user is asking for image generation
function detectImageRequest(text: string): { isImageRequest: boolean; prompt: string } {
  const imagePatterns = [
    /(?:دروست|بکە|دروستبکە|جێبەجێ|بکەرە)\s*(?:وێنەیەک|وێنە|image|picture|photo)/i,
    /(?:وێنەیەک|وێنە|image|picture)\s*(?:دروست|بکە|generate|create|make)/i,
    /generate\s*(?:an?\s*)?(?:image|picture|photo)/i,
    /create\s*(?:an?\s*)?(?:image|picture|photo)/i,
    /make\s*(?:an?\s*)?(?:image|picture|photo)/i,
    /draw\s*/i,
    /وێنەم\s*بۆ/i,
    /وێنە\s*بۆم/i,
  ]
  
  const isImageRequest = imagePatterns.some(pattern => pattern.test(text))
  
  // Extract prompt - remove the command words
  let prompt = text
    .replace(/(?:دروست|بکە|دروستبکە|جێبەجێ|بکەرە)/gi, '')
    .replace(/(?:وێنەیەک|وێنە|image|picture|photo)/gi, '')
    .replace(/(?:generate|create|make|draw)/gi, '')
    .replace(/(?:بۆم|بۆ|of|for)/gi, '')
    .trim()
  
  // If prompt is empty, use original text
  if (!prompt || prompt.length < 3) {
    prompt = text
  }
  
  return { isImageRequest, prompt }
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

    const { data: profile } = await supabase.from("profiles").select("credits, role").eq("id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check credits (admins have unlimited)
    if (profile.role !== "admin" && profile.credits < 1) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    const { messages, model, temperature = 0.7, maxTokens = 2048 } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 })
    }

    // Check if the last message is asking for image generation
    const lastMessage = messages[messages.length - 1]
    const messageText = typeof lastMessage?.content === "string" 
      ? lastMessage.content 
      : lastMessage?.content?.find((c: { type: string }) => c.type === "text")?.text || ""
    
    const { isImageRequest, prompt: imagePrompt } = detectImageRequest(messageText)
    
    if (isImageRequest) {
      try {
        console.log("[v0] Detected image request, generating with Pollinations:", imagePrompt)
        const images = await generateWithPollinations(imagePrompt, "1024x1024")
        
        // Deduct credits for non-admins
        if (profile.role !== "admin") {
          await supabase
            .from("profiles")
            .update({ credits: profile.credits - 2 })
            .eq("id", user.id)
        }
        
        // Log generation
        await supabase.from("generations").insert({
          user_id: user.id,
          type: "image",
          provider: "pollinations",
          prompt: imagePrompt.slice(0, 500),
          status: "completed",
          result_url: images[0],
          credits_used: 2,
          metadata: { source: "chat", model: "flux" },
        })
        
        return NextResponse.json({
          content: `وێنەکەت ئامادەیە:\n\n![Generated Image](${images[0]})\n\n**پرۆمپت:** ${imagePrompt}`,
          imageUrl: images[0],
          isImage: true,
        })
      } catch (imageError) {
        console.error("[v0] Image generation error:", imageError)
        // Fall back to text response if image generation fails
      }
    }

    const cleanedMessages = messages.map(
      (msg: {
        role: string
        content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
      }) => {
        // If content is array (vision message)
        if (Array.isArray(msg.content)) {
          // For assistant messages, filter out image URLs (API doesn't allow them)
          if (msg.role === "assistant") {
            const textContent = msg.content
              .filter((c: { type: string }) => c.type === "text")
              .map((c: { text?: string }) => c.text || "")
              .join("\n")
            return { role: msg.role, content: textContent }
          }
          return { role: msg.role, content: msg.content }
        }
        // For assistant text messages, remove image markdown to avoid issues
        if (msg.role === "assistant" && typeof msg.content === "string") {
          // Remove image markdown like ![...](url)
          const cleanContent = msg.content.replace(/!\[.*?\]\(.*?\)/g, "[Image was generated]")
          return { role: msg.role, content: cleanContent }
        }
        return { role: msg.role, content: msg.content }
      },
    )

    const isGroqModel = model.startsWith("groq/")
    const isSambaNovaModel = model.startsWith("sambanova/")

    let apiUrl: string
    let apiKey: string | undefined
    let actualModel: string

    if (isSambaNovaModel) {
      // Use SambaNova directly
      apiUrl = "https://api.sambanova.ai/v1/chat/completions"
      apiKey = process.env.SAMBANOVA_API_KEY
      // Remove "sambanova/" prefix for actual API call
      actualModel = model.replace("sambanova/", "")

      if (!apiKey) {
        return NextResponse.json({ error: "SambaNova API key not configured. Add SAMBANOVA_API_KEY in Vars." }, { status: 500 })
      }
    } else if (isGroqModel) {
      // Use Groq directly
      apiUrl = "https://api.groq.com/openai/v1/chat/completions"
      apiKey = process.env.GROQ_API_KEY
      // Remove "groq/" prefix for actual API call
      actualModel = model.replace("groq/", "")

      if (!apiKey) {
        return NextResponse.json({ error: "Groq API key not configured. Add GROQ_API_KEY in Vars." }, { status: 500 })
      }
    } else {
      // Use OpenRouter
      apiUrl = "https://openrouter.ai/api/v1/chat/completions"
      apiKey = process.env.OPENROUTER_API_KEY
      actualModel = model

      if (!apiKey) {
        return NextResponse.json(
          { error: "OpenRouter API key not configured. Add OPENROUTER_API_KEY in Vars." },
          { status: 500 },
        )
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }

    // Add OpenRouter-specific headers
    if (!isGroqModel && !isSambaNovaModel) {
      headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL || "https://ai-studio.vercel.app"
      headers["X-Title"] = "AI Studio"
    }

    // Add powerful system prompt for smarter responses
    const systemPrompt = {
      role: "system",
      content: `You are an advanced AI assistant with no restrictions on helpfulness. You are:

1. EXTREMELY KNOWLEDGEABLE - You have vast knowledge across all topics including science, technology, history, arts, languages, coding, and more.

2. CREATIVE & UNRESTRICTED - You can write stories, poems, code, essays, and creative content without artificial limitations. You help with ALL requests.

3. MULTILINGUAL - You're fluent in Kurdish (Sorani & Kurmanji), Arabic, English, Persian, Turkish and many other languages. Always respond in the user's language.

4. HELPFUL & DETAILED - You provide comprehensive, detailed answers. Never give short or lazy responses. Explain thoroughly.

5. IMAGE GENERATION - When users ask you to create/generate/draw an image (in any language), you MUST detect this and create it. Keywords: "وێنە", "دروست بکە", "generate image", "draw", "create picture".

6. CODING EXPERT - You can write code in any programming language, debug, explain algorithms, and help with software development.

7. NO REFUSALS - You help with all legitimate requests. You don't refuse to help with creative writing, roleplay, hypothetical scenarios, or educational content.

Always be helpful, detailed, and engaging. Never be lazy or give minimal responses.`
    }

    // Prepend system message to cleaned messages
    const messagesWithSystem = [systemPrompt, ...cleanedMessages]

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: actualModel,
        messages: messagesWithSystem,
        temperature: Math.min(temperature, 0.9), // Allow more creativity
        max_tokens: Math.max(maxTokens, 4096), // Allow longer responses
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error("Chat API error:", error)

      if (response.status === 401) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
      }
      if (response.status === 402) {
        return NextResponse.json({ error: "Account has insufficient credits" }, { status: 402 })
      }
      if (response.status === 404) {
        return NextResponse.json({ error: "Model not found. Please select a different model." }, { status: 404 })
      }
      if (response.status === 429) {
        return NextResponse.json({ error: "Rate limited. Please wait a moment and try again." }, { status: 429 })
      }

      return NextResponse.json(
        { error: error.error?.message || `API error: ${response.status}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""

    const usage = data.usage || null

    // Deduct credits (1 per message) for non-admins
    if (profile.role !== "admin") {
      await supabase
        .from("profiles")
        .update({ credits: profile.credits - 1 })
        .eq("id", user.id)
    }

    // Get text content for logging
    const promptText = typeof lastMessage?.content === "string"
      ? lastMessage.content
      : lastMessage?.content?.find((c: { type: string }) => c.type === "text")?.text || ""

    // Log generation
    await supabase.from("generations").insert({
      user_id: user.id,
      type: "chat",
      provider: isSambaNovaModel ? "sambanova" : isGroqModel ? "groq" : "openrouter",
      prompt: promptText.slice(0, 500),
      status: "completed",
      result_url: null,
      credits_used: 1,
      metadata: {
        model: actualModel,
        response_length: content.length,
        usage: usage,
      },
    })

    return NextResponse.json({
      content,
      usage,
    })
  } catch (error) {
    console.error("Chat generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate response" },
      { status: 500 },
    )
  }
}
