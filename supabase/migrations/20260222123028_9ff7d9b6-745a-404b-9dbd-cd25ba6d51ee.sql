
-- Tighten complaints write policies to admin only
DROP POLICY "Authenticated users can update complaints" ON public.complaints;
DROP POLICY "Authenticated users can delete complaints" ON public.complaints;

CREATE POLICY "Admins can update complaints"
ON public.complaints FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete complaints"
ON public.complaints FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Tighten wards write policies to admin only
DROP POLICY "Authenticated users can insert wards" ON public.wards;
DROP POLICY "Authenticated users can update wards" ON public.wards;
DROP POLICY "Authenticated users can delete wards" ON public.wards;

CREATE POLICY "Admins can insert wards"
ON public.wards FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update wards"
ON public.wards FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete wards"
ON public.wards FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
