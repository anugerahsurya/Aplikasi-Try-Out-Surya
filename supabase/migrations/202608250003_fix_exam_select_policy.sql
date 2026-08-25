-- Allow any authenticated user to view published exams or admins to view all exams
DROP POLICY IF EXISTS "assigned published exam" ON public.exams;
DROP POLICY IF EXISTS "published exam public select" ON public.exams;

CREATE POLICY "published exam public select" ON public.exams
FOR SELECT
USING (status = 'published' OR public.is_admin());
