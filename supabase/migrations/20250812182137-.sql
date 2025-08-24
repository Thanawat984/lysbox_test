-- Restrict landing content editing to super_admin only
-- Drop existing write policies that allow content_admin
DROP POLICY IF EXISTS "faqs_write_super_or_content_admin" ON public.faqs;
DROP POLICY IF EXISTS "testimonials_write_super_or_content_admin" ON public.testimonials;
DROP POLICY IF EXISTS "logos_write_super_or_content_admin" ON public.logos;
DROP POLICY IF EXISTS "kpis_write_super_or_content_admin" ON public.kpis;
DROP POLICY IF EXISTS "promotions_write_super_or_content_admin" ON public.promotions;
DROP POLICY IF EXISTS "site_settings_write_super_or_content_admin" ON public.site_settings;

-- Create super_admin-only write policies (keep public SELECT policies as-is)
CREATE POLICY "faqs_write_super"
ON public.faqs
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "testimonials_write_super"
ON public.testimonials
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "logos_write_super"
ON public.logos
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "kpis_write_super"
ON public.kpis
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "promotions_write_super"
ON public.promotions
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "site_settings_write_super"
ON public.site_settings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::public.app_role));