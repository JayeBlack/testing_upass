-- Supervisor resources (templates/guidelines shared with students)
CREATE TABLE IF NOT EXISTS public.supervisor_resources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id TEXT NOT NULL,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  description  TEXT,
  file_path    TEXT NOT NULL,
  file_size    BIGINT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_resources ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.supervisor_resources TO anon, authenticated;
CREATE POLICY "Anyone can manage resources" ON public.supervisor_resources USING (true) WITH CHECK (true);

-- Supervisor announcements sent to students
CREATE TABLE IF NOT EXISTS public.supervisor_announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id TEXT NOT NULL,
  text          TEXT NOT NULL,
  visibility    TEXT NOT NULL DEFAULT 'All Students',
  scheduled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_announcements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.supervisor_announcements TO anon, authenticated;
CREATE POLICY "Anyone can manage announcements" ON public.supervisor_announcements USING (true) WITH CHECK (true);

-- Storage bucket for supervisor resources
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('supervisor-resources', 'supervisor-resources', true, 20971520)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public resource upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'supervisor-resources');
CREATE POLICY "Public resource read"   ON storage.objects FOR SELECT USING (bucket_id = 'supervisor-resources');
CREATE POLICY "Public resource delete" ON storage.objects FOR DELETE USING (bucket_id = 'supervisor-resources');
