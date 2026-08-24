-- Migration: Add user visual theme preference to public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS theme VARCHAR(30) DEFAULT 'oled-black' NOT NULL;

-- Ensure comment is registered for schema documentation
COMMENT ON COLUMN public.users.theme IS 'User selected visual theme preset (e.g. oled-black, midnight-blue, forest-sage, warm-amber, cyberpunk-violet, clean-light)';
