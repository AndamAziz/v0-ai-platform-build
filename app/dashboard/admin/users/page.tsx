import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UsersTable } from "@/components/admin/users-table"

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single()

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">User Management</h1>
        <p className="text-muted-foreground">Manage users, credits, and permissions</p>
      </div>

      <UsersTable users={users || []} />
    </div>
  )
}
