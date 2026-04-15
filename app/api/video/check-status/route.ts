import { NextResponse } from "next/server"

export async function GET() {
  const didApiKey = process.env.DID_API_KEY
  const replicateApiKey = process.env.REPLICATE_API_TOKEN
  const vps2ApiKey = process.env.VPS2_API_KEY

  return NextResponse.json({
    available: !!(didApiKey || vps2ApiKey),
    didAvailable: !!didApiKey,
    replicateAvailable: !!replicateApiKey,
    vps2Available: !!vps2ApiKey,
    provider: didApiKey ? "d-id" : vps2ApiKey ? "vps2" : null,
    reason: didApiKey
      ? "D-ID API is configured and ready"
      : vps2ApiKey
        ? "VPS2 API is configured and ready"
        : "No video API configured. Add DID_API_KEY or VPS2_API_KEY to enable video generation.",
  })
}
