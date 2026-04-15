import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

// Singleton instance - only create one client per browser session
let supabaseClient: SupabaseClient | null = null

export function createClient() {
  // Return existing client if available
  if (supabaseClient) {
    return supabaseClient
  }
  
  // Only create client in browser environment
  if (typeof window === "undefined") {
    // Return a new instance for SSR (will be discarded)
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  
  // Create and cache the singleton for browser
  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  return supabaseClient
}
