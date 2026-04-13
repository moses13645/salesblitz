ALTER TABLE public.business_units
ADD COLUMN session_duration_minutes integer DEFAULT NULL,
ADD COLUMN session_started_at timestamptz DEFAULT NULL;