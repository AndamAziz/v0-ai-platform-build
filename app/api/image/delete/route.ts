import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Check if user owns this generation or is admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()

    const { data: generation } = await supabase
      .from("generations")
      .select("user_id, result_url, type")
      .eq("id", id)
      .maybeSingle()

    if (!generation) {
      return NextResponse.json({ error: "Item not found or already deleted" }, { status: 404 })
    }

    if (generation.user_id !== user.id && profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const resultUrl = generation.result_url
    console.log("[v0] Deleting item:", id, "Type:", generation.type, "URL:", resultUrl?.substring(0, 100))

    // Delete from Supabase storage if it's a Supabase URL
    if (resultUrl?.includes("supabase.co")) {
      try {
        // Extract bucket and path from URL
        // Format: https://xxx.supabase.co/storage/v1/object/public/bucket/path
        const url = new URL(resultUrl)
        const pathParts = url.pathname.split("/")
        
        // Find bucket name (after 'public' or 'private')
        const publicIndex = pathParts.indexOf("public")
        const privateIndex = pathParts.indexOf("private")
        const startIndex = publicIndex !== -1 ? publicIndex + 1 : (privateIndex !== -1 ? privateIndex + 1 : -1)
        
        if (startIndex !== -1 && startIndex < pathParts.length) {
          const bucket = pathParts[startIndex]
          const filePath = decodeURIComponent(pathParts.slice(startIndex + 1).join("/"))
          
          if (bucket && filePath) {
            console.log("[v0] Deleting from Supabase storage - Bucket:", bucket, "Path:", filePath)
            const { error: storageError } = await supabase.storage.from(bucket).remove([filePath])
            if (storageError) {
              console.log("[v0] Supabase storage delete error:", storageError.message)
            } else {
              console.log("[v0] Supabase storage delete success")
            }
          }
        }
      } catch (storageError: any) {
        console.log("[v0] Supabase storage error:", storageError.message)
      }
    }

    // Delete from Vercel Blob if it's a Vercel Blob URL
    if (resultUrl?.includes("vercel-storage.com") || resultUrl?.includes("blob.vercel")) {
      try {
        const { del } = await import("@vercel/blob")
        console.log("[v0] Deleting from Vercel Blob:", resultUrl.substring(0, 80))
        await del(resultUrl)
        console.log("[v0] Vercel Blob delete success")
      } catch (blobError: any) {
        console.log("[v0] Vercel Blob delete error:", blobError.message)
      }
    }

    // Delete from Replicate URLs
    if (resultUrl?.includes("replicate.delivery") || resultUrl?.includes("replicate.com")) {
      console.log("[v0] Replicate URL - these are temporary and will expire automatically")
    }

    // Delete from Hugging Face temporary URLs
    if (resultUrl?.includes("hf.space") || resultUrl?.includes("huggingface")) {
      console.log("[v0] HuggingFace URL - these are temporary and will expire automatically")
    }

    // Delete from database - this removes the record completely
    console.log("[v0] Deleting from database...")
    const { error, count } = await supabase
      .from("generations")
      .delete()
      .eq("id", id)
      .select()

    if (error) {
      console.log("[v0] Database delete error:", error.message)
      throw error
    }

    console.log("[v0] Database delete success - removed record:", id)
    return NextResponse.json({ success: true, message: `${generation.type || "Item"} deleted successfully` })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 500 },
    )
  }
}
