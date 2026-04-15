-- Add last_daily_credit column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_daily_credit TIMESTAMPTZ DEFAULT NOW();

-- Update the signup trigger to give 50 free credits for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, credits, last_daily_credit)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user'),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' = 'admin' THEN 999999
      ELSE 50  -- Changed from 100 to 50 free credits on signup
    END,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Function to claim daily credits (10 credits every 24 hours)
CREATE OR REPLACE FUNCTION public.claim_daily_credits(user_id UUID)
RETURNS TABLE(success BOOLEAN, credits_added INTEGER, new_balance INTEGER, next_claim TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_claim TIMESTAMPTZ;
  v_current_credits INTEGER;
  v_role TEXT;
  v_next_claim TIMESTAMPTZ;
BEGIN
  -- Get user's current info
  SELECT p.last_daily_credit, p.credits, p.role 
  INTO v_last_claim, v_current_credits, v_role
  FROM profiles p
  WHERE p.id = user_id;
  
  -- Admins don't need daily credits
  IF v_role = 'admin' THEN
    RETURN QUERY SELECT FALSE, 0, v_current_credits, NOW();
    RETURN;
  END IF;
  
  -- Check if 24 hours have passed
  IF v_last_claim IS NULL OR (NOW() - v_last_claim) >= INTERVAL '24 hours' THEN
    -- Add 10 credits
    UPDATE profiles 
    SET credits = credits + 10,
        last_daily_credit = NOW(),
        updated_at = NOW()
    WHERE id = user_id
    RETURNING credits INTO v_current_credits;
    
    v_next_claim := NOW() + INTERVAL '24 hours';
    RETURN QUERY SELECT TRUE, 10, v_current_credits, v_next_claim;
  ELSE
    -- Not eligible yet
    v_next_claim := v_last_claim + INTERVAL '24 hours';
    RETURN QUERY SELECT FALSE, 0, v_current_credits, v_next_claim;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_daily_credits(UUID) TO authenticated;
