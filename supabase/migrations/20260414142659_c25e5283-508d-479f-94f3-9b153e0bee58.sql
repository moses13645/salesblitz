
CREATE POLICY "Anyone can update activity_logs" ON public.activity_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete activity_logs" ON public.activity_logs FOR DELETE USING (true);
