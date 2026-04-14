CREATE POLICY "Anyone can delete business_units"
ON public.business_units
FOR DELETE
TO public
USING (true);