-- Run this script AFTER creating your admin account via sign-up
-- Replace 'andam@outlook.com' with your actual admin email if different

-- Update the profile for your admin account
UPDATE public.profiles 
SET 
  role = 'admin',
  credits = 999999
WHERE email = 'andam@outlook.com';

-- Verify the update worked
SELECT id, email, role, credits FROM public.profiles WHERE email = 'andam@outlook.com';
