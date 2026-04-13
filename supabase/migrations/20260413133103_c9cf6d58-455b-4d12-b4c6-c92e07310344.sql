
ALTER TABLE public.business_units
ADD COLUMN session_phases jsonb DEFAULT NULL,
ADD COLUMN current_phase_index integer DEFAULT 0;
