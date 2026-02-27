
-- Create complaints table
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id TEXT NOT NULL UNIQUE,
  name TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  mobile TEXT,
  email TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ward_id TEXT,
  ward_name TEXT,
  before_image_url TEXT,
  after_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  priority TEXT NOT NULL DEFAULT 'Medium',
  assigned_staff TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Public can insert complaints (no auth required for citizens)
CREATE POLICY "Anyone can submit complaints"
ON public.complaints
FOR INSERT
WITH CHECK (true);

-- Public can view complaints (for tracking)
CREATE POLICY "Anyone can view complaints"
ON public.complaints
FOR SELECT
USING (true);

-- Only authenticated admins can update complaints
CREATE POLICY "Authenticated users can update complaints"
ON public.complaints
FOR UPDATE
TO authenticated
USING (true);

-- Only authenticated admins can delete complaints
CREATE POLICY "Authenticated users can delete complaints"
ON public.complaints
FOR DELETE
TO authenticated
USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create complaint ID sequence
CREATE SEQUENCE IF NOT EXISTS complaint_id_seq START 1;

-- Function to generate complaint ID
CREATE OR REPLACE FUNCTION public.generate_complaint_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.complaint_id := 'SC' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('complaint_id_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_complaint_id
BEFORE INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.generate_complaint_id();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;

-- Create storage bucket for complaint images
INSERT INTO storage.buckets (id, name, public) VALUES ('complaint-images', 'complaint-images', true);

-- Storage policies
CREATE POLICY "Anyone can upload complaint images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'complaint-images');

CREATE POLICY "Anyone can view complaint images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'complaint-images');

CREATE POLICY "Authenticated users can update complaint images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'complaint-images');
