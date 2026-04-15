import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Check VPS2 job status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if job exists and get status
  const { data: job, error } = await supabase
    .from("vps2_jobs")
    .select("*")
    .eq("id", jobId)
    .single()

  if (error || !job) {
    return NextResponse.json({ status: "not_found" }, { status: 404 })
  }

  return NextResponse.json({
    status: job.status,
    imageUrl: job.image_url,
    error: job.error,
    createdAt: job.created_at,
    completedAt: job.completed_at,
  })
}
