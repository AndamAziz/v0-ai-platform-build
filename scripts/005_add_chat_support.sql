-- Add model column to generations table
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS model TEXT;

-- Update type check constraint to include 'chat'
ALTER TABLE public.generations DROP CONSTRAINT IF EXISTS generations_type_check;
ALTER TABLE public.generations ADD CONSTRAINT generations_type_check 
  CHECK (type IN ('image', 'video', 'voice', 'chat'));

-- Add OpenRouter to api_status
INSERT INTO public.api_status (provider, status) VALUES
  ('openrouter', 'unknown')
ON CONFLICT (provider) DO NOTHING;
