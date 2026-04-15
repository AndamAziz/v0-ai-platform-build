export interface Profile {
  id: string
  email: string
  role: "admin" | "user"
  credits: number
  created_at: string
  updated_at: string
  last_daily_credit: string | null
  full_name: string | null
}

export interface Generation {
  id: string
  user_id: string
  type: "image" | "video" | "voice" | "website" | "chat"
  provider: string
  prompt: string | null
  status: "pending" | "processing" | "completed" | "failed"
  result_url: string | null
  credits_used: number
  metadata: Record<string, unknown>
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface ApiStatus {
  id: string
  provider: string
  status: "online" | "offline" | "error" | "unknown"
  last_checked_at: string | null
  last_error: string | null
  response_time_ms: number | null
  created_at: string
  updated_at: string
}

export interface CreditConfig {
  image: number
  video: number
  voice: number
  website: number
  chat: number
}

export const CREDIT_COSTS: CreditConfig = {
  image: 5,
  video: 20,
  voice: 2,
  website: 10,
  chat: 1,
}
