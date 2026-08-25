-- Add last_sign_in_at column to public.profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;
