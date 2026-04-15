-- Create VPS2 jobs table for async image generation
CREATE TABLE IF NOT EXISTS vps2_jobs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  prompt TEXT NOT NULL,
  width INTEGER DEFAULT 512,
  height INTEGER DEFAULT 512,
  style TEXT,
  negative_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  image_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vps2_jobs_user_id ON vps2_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_vps2_jobs_status ON vps2_jobs(status);

-- Enable RLS
ALTER TABLE vps2_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view their own jobs" ON vps2_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create jobs
CREATE POLICY "Users can create jobs" ON vps2_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update jobs (for webhook)
CREATE POLICY "Service role can update jobs" ON vps2_jobs
  FOR UPDATE USING (true);
