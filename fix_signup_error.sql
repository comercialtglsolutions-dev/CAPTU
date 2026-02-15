-- EMERGENCY FIX: Remove the trigger that is likely causing the 500 error on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Ensure the profiles table exists and is ready for manual insertion via frontend
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  first_name text,
  last_name text,
  company text,
  phone text,
  email text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Make sure RLS policies allow the frontend to insert the profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Re-create policies to ensure they are correct
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
