import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Call the database function to claim daily credits
    const { data, error } = await supabase.rpc("claim_daily_credits", {
      user_id: user.id,
    })

    if (error) {
      console.error("Error claiming daily credits:", error)
      return NextResponse.json({ error: "Failed to claim credits" }, { status: 500 })
    }

    const result = data?.[0] || { success: false, credits_added: 0, new_balance: 0, next_claim: null }

    return NextResponse.json({
      success: result.success,
      creditsAdded: result.credits_added,
      newBalance: result.new_balance,
      nextClaim: result.next_claim,
    })
  } catch (error) {
    console.error("Daily credits error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
