-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all generations" ON public.generations;
DROP POLICY IF EXISTS "Admins can update api status" ON public.api_status;

-- Create a security definer function to check admin role without triggering RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies (simplified to avoid recursion)
-- Combined user and admin SELECT into single policy
CREATE POLICY "Users can view own profile or admins can view all" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

-- Combined user and admin UPDATE into single policy
CREATE POLICY "Users can update own profile or admins can update all" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR public.is_admin()
  );

-- Admin delete policy using security definer function
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- Admin insert policy for creating users
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR public.is_admin()
  );

-- Fix generations admin policy
CREATE POLICY "Admins can view all generations" ON public.generations
  FOR SELECT USING (public.is_admin());

-- Fix api_status admin policy
CREATE POLICY "Admins can manage api status" ON public.api_status
  FOR ALL USING (public.is_admin());
