-- =============================================
-- Migration: Support Multiple Naming Patterns per Company
-- =============================================

-- 1. Create join table company_naming_patterns
CREATE TABLE IF NOT EXISTS public.company_naming_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    naming_pattern_id UUID NOT NULL REFERENCES public.naming_patterns(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, naming_pattern_id)
);

-- 2. Migrate existing naming_pattern_id from companies to the join table
INSERT INTO public.company_naming_patterns (company_id, naming_pattern_id, priority)
SELECT id, naming_pattern_id, 0
FROM public.companies
WHERE naming_pattern_id IS NOT NULL;

-- 3. Enable RLS for company_naming_patterns
ALTER TABLE public.company_naming_patterns ENABLE ROW LEVEL SECURITY;

-- 4. Policies for company_naming_patterns
CREATE POLICY "Allow authenticated read access for company_naming_patterns" 
ON public.company_naming_patterns FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow masters to manage company_naming_patterns" 
ON public.company_naming_patterns FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'master' OR role = 'admin')
    )
);

-- 5. COMMENT: We will drop the naming_pattern_id column from companies later 
-- to avoid breaking the application before the backend is updated.
-- ALTER TABLE public.companies DROP COLUMN IF EXISTS naming_pattern_id;
