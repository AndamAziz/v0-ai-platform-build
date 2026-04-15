import { createClient } from "@/lib/supabase/server"
import { VoiceStudio } from "@/components/studios/voice-studio"

export default async function VoiceStudioPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single()

  const { data: generations } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", user?.id)
    .eq("type", "voice")
    .order("created_at", { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Voice Studio</h1>
        <p className="text-muted-foreground">Generate natural speech with AI</p>
      </div>

      <VoiceStudio profile={profile} generations={generations || []} />
    </div>
  )
}
