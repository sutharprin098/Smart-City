
-- Create wards table for storing uploaded GeoJSON ward boundaries
CREATE TABLE public.wards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ward_id text NOT NULL UNIQUE,
  ward_name text NOT NULL,
  population integer NOT NULL DEFAULT 0,
  officer_name text,
  geometry jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;

-- Anyone can read wards (needed for public complaint submission ward detection)
CREATE POLICY "Anyone can view wards"
ON public.wards FOR SELECT
USING (true);

-- Only authenticated users can manage wards
CREATE POLICY "Authenticated users can insert wards"
ON public.wards FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update wards"
ON public.wards FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete wards"
ON public.wards FOR DELETE
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_wards_updated_at
BEFORE UPDATE ON public.wards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wards;
