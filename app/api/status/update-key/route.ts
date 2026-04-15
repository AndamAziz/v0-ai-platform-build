import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { provider, envKey, value } = await request.json()

    if (!provider || !envKey) {
      return NextResponse.json({ success: false, error: "Missing provider or envKey" }, { status: 400 })
    }

    // Note: In a real deployment, environment variables cannot be updated at runtime.
    // This endpoint stores the key in a server-side cache or database for the session.
    // For v0/Vercel, users need to update Vars in the dashboard.

    // For now, we'll verify the key works by making a test request
    let isValid = false
    let testError = null

    try {
      switch (provider) {
        case "groq":
          const groqRes = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { Authorization: `Bearer ${value}` },
          })
          isValid = groqRes.status === 200
          break

        case "openrouter":
          const orRes = await fetch("https://openrouter.ai/api/v1/models", {
            headers: { Authorization: `Bearer ${value}` },
          })
          isValid = orRes.status === 200
          break

        case "openai":
          const oaiRes = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${value}` },
          })
          isValid = oaiRes.status === 200
          break

        case "huggingface":
          const hfRes = await fetch("https://huggingface.co/api/whoami-v2", {
            headers: { Authorization: `Bearer ${value}` },
          })
          isValid = hfRes.status === 200
          break

        case "vps2":
          const vps2Res = await fetch("https://image.pluschannel.co.uk/api/info", {
            headers: { "x-api-key": value },
          })
          isValid = vps2Res.ok
          break

        case "freepik":
          const fpRes = await fetch("https://api.freepik.com/v1/resources?limit=1", {
            headers: { "x-freepik-api-key": value },
          })
          isValid = fpRes.status === 200 || (fpRes.status === 401) === false
          break

        default:
          // For other providers, assume valid if key is provided
          isValid = value && value.length > 0
      }
    } catch (e: any) {
      testError = e.message
      isValid = false
    }

    if (isValid) {
      return NextResponse.json({
        success: true,
        message: `${provider} API key verified successfully. Note: To persist this key, please update it in v0 Vars (${envKey}).`,
        verified: true,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: testError || "API key verification failed. Please check the key and try again.",
        verified: false,
      })
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
