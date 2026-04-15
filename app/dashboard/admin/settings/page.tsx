import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CREDIT_COSTS } from "@/lib/types"

export default async function AdminSettingsPage() {
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
        <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="text-muted-foreground">Configure platform settings and credit costs</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Credit Configuration</CardTitle>
            <CardDescription>Default credit costs per generation type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="font-medium">Image Generation</span>
              <span className="rounded-full bg-muted px-3 py-1 text-sm">{CREDIT_COSTS.image} credits</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="font-medium">Video Generation</span>
              <span className="rounded-full bg-muted px-3 py-1 text-sm">{CREDIT_COSTS.video} credits</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="font-medium">Voice Generation</span>
              <span className="rounded-full bg-muted px-3 py-1 text-sm">{CREDIT_COSTS.voice} credits</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Required API keys for providers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "OPENAI_API_KEY",
              "STABILITY_API_KEY",
              "HUGGINGFACE_API_KEY",
              "ELEVENLABS_API_KEY",
              "GROQ_API_KEY",
              "FAL_KEY",
              "REPLICATE_API_TOKEN",
            ].map((key) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="font-mono text-sm">{key}</span>
                <span className="text-xs text-muted-foreground">{process.env[key] ? "Configured" : "Not set"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
