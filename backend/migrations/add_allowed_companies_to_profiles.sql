-- Migration: Add allowed_companies to profiles table
-- Purpose: Enable row-level isolation for different clients/companies.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='allowed_companies') THEN
        ALTER TABLE public.profiles ADD COLUMN allowed_companies text[] DEFAULT NULL;
        COMMENT ON COLUMN public.profiles.allowed_companies IS 'Array of company slugs this user is allowed to access. NULL means all.';
    END IF;
END $$;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'allowed_companies';
