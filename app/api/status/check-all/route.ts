import { NextResponse } from "next/server"

interface StatusResult {
  status: "online" | "offline" | "error" | "not_configured"
  error?: string
  responseTime?: number
  keyValue?: string
}

function getEnvKeyValue(envKey: string): string | undefined {
  const value = process.env[envKey]
  return value || undefined
}

async function checkProvider(name: string, envKey: string, checkFn: () => Promise<void>): Promise<StatusResult> {
  const start = Date.now()
  const keyValue = getEnvKeyValue(envKey)

  try {
    await checkFn()
    return {
      status: "online",
      responseTime: Date.now() - start,
      keyValue,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    if (errorMessage.includes("not configured") || errorMessage.includes("API key")) {
      return {
        status: "not_configured",
        error: errorMessage,
        responseTime: Date.now() - start,
        keyValue,
      }
    }
    return {
      status: "error",
      error: errorMessage,
      responseTime: Date.now() - start,
      keyValue,
    }
  }
}

export async function GET() {
  const results: Record<string, StatusResult> = {}

  const checks = await Promise.all([
    // Groq
    checkProvider("groq", "GROQ_API_KEY", async () => {
      if (!process.env.GROQ_API_KEY) throw new Error("API key not configured")
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // OpenRouter
    checkProvider("openrouter", "OPENROUTER_API_KEY", async () => {
      if (!process.env.OPENROUTER_API_KEY) throw new Error("API key not configured")
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // OpenAI
    checkProvider("openai", "OPENAI_API_KEY", async () => {
      if (!process.env.OPENAI_API_KEY) throw new Error("API key not configured")
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // Google Gemini
    checkProvider("gemini", "GEMINI_API_KEY", async () => {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      if (!apiKey) throw new Error("API key not configured")
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // HuggingFace
    checkProvider("huggingface", "HUGGINGFACE_API_KEY", async () => {
      if (!process.env.HUGGINGFACE_API_KEY) throw new Error("API key not configured")
      const res = await fetch("https://huggingface.co/api/whoami-v2", {
        headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // Stability AI
    checkProvider("stability", "STABILITY_API_KEY", async () => {
      if (!process.env.STABILITY_API_KEY) throw new Error("API key not configured")
      const res = await fetch("https://api.stability.ai/v1/user/account", {
        headers: { Authorization: `Bearer ${process.env.STABILITY_API_KEY}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // Replicate
    checkProvider("replicate", "REPLICATE_API_TOKEN", async () => {
      if (!process.env.REPLICATE_API_TOKEN) throw new Error("API key not configured")
      const res = await fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // Freepik
    checkProvider("freepik", "FREEPIK_API_KEY", async () => {
      if (!process.env.FREEPIK_API_KEY) throw new Error("API key not configured")
      // Use resources endpoint to validate API key
      const res = await fetch("https://api.freepik.com/v1/resources?limit=1", {
        headers: {
          "x-freepik-api-key": process.env.FREEPIK_API_KEY,
          Accept: "application/json",
        },
      })
      // 200, 401, 403 all indicate the API is reachable
      if (res.status === 401 || res.status === 403) throw new Error("Invalid API key")
      if (!res.ok && res.status !== 200) throw new Error(`HTTP ${res.status}`)
    }),

    // D-ID
    checkProvider("did", "DID_API_KEY", async () => {
      if (!process.env.DID_API_KEY) throw new Error("API key not configured")
      const res = await fetch("https://api.d-id.com/credits", {
        headers: {
          Authorization: `Basic ${process.env.DID_API_KEY}`,
          "Content-Type": "application/json",
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // ElevenLabs
    checkProvider("elevenlabs", "ELEVENLABS_API_KEY", async () => {
      if (!process.env.ELEVENLABS_API_KEY) throw new Error("API key not configured")
      const res = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // Kurdish TTS
    checkProvider("kurdish_tts", "KURDISH_TTS_API_KEY", async () => {
      if (!process.env.KURDISH_TTS_API_KEY) throw new Error("API key not configured")
      // Kurdish TTS check with API call
      const res = await fetch("https://www.kurdishtts.com/api/tts-proxy", {
        method: "POST",
        headers: {
          "x-api-key": process.env.KURDISH_TTS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: "test", speaker_id: "sorani_85" }),
      })
      if (!res.ok && res.status !== 200) throw new Error(`HTTP ${res.status}`)
    }),

    checkProvider("vps2", "VPS2_API_KEY", async () => {
      const apiKey = process.env.VPS2_API_KEY || "test_key_123"
      const res = await fetch("https://image.pluschannel.co.uk/api/check-status", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    checkProvider("vps", "VPS_API_KEY", async () => {
      const apiKey = process.env.VPS_API_KEY || "test_key_123"
      const res = await fetch("https://image.pluschannel.co.uk/api/check-status", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // Supabase
    checkProvider("supabase", "SUPABASE_URL", async () => {
      if (!process.env.SUPABASE_URL) throw new Error("Not configured")
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY || "",
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || ""}`,
        },
      })
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`)
    }),
  ])

  const providerNames = [
    "groq",
    "openrouter",
    "openai",
    "gemini",
    "huggingface",
    "stability",
    "replicate",
    "freepik",
    "did",
    "elevenlabs",
    "kurdish_tts",
    "vps2",
    "vps",
    "supabase",
  ]

  providerNames.forEach((name, index) => {
    results[name] = checks[index]
  })

  return NextResponse.json({ results })
}
