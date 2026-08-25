-- Create announcements / system notifications table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'announcement', -- 'announcement', 'exam', 'security', 'leaderboard'
  target_role text DEFAULT 'all', -- 'all', 'participant', 'admin'
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements view all" ON public.announcements
FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "announcements admin manage" ON public.announcements
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
