import { createClient } from "@/lib/supabase/server"
import { ImageStudio } from "@/components/studios/image-studio"

export default async function ImageStudioPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single()

  const { data: generations } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", user?.id)
    .eq("type", "image")
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Image Studio</h1>
        <p className="text-muted-foreground">Generate stunning images with AI</p>
      </div>

      <ImageStudio profile={profile} generations={generations || []} />
    </div>
  )
}
