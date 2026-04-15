import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { WebsiteStudio } from "@/components/studios/website-studio"

export default async function WebsitePage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: generations } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "website")
    .order("created_at", { ascending: false })
    .limit(10)

  return <WebsiteStudio profile={profile} generations={generations || []} />
}
