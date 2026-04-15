import { createClient } from "@/lib/supabase/server"
import { MP3EditorStudio } from "@/components/studios/mp3-editor-studio"

export default async function MP3EditorPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">MP3 Editor</h1>
        <p className="text-muted-foreground">Cut and trim audio files - free, no credits required</p>
      </div>

      <MP3EditorStudio profile={profile} />
    </div>
  )
}
