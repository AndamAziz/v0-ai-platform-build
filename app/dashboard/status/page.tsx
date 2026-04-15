import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ApiStatusDashboard } from "@/components/status/api-status-dashboard"

export default async function StatusPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single()

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">API Status</h1>
        <p className="text-muted-foreground">Monitor and manage API keys for all AI providers</p>
      </div>

      <ApiStatusDashboard />
    </div>
  )
}
