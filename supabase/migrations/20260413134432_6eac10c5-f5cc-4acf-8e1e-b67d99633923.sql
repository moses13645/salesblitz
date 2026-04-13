
ALTER TABLE public.targets
ADD COLUMN custom_fields jsonb DEFAULT NULL;

ALTER TABLE public.activity_logs
ADD COLUMN fields_data jsonb DEFAULT NULL;
