import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PortraitStudio } from "@/components/studios/portrait-studio"

export default async function PortraitPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/login")
  }

  return <PortraitStudio profile={profile} />
}
