
-- Create business_units table
CREATE TABLE public.business_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create salespeople table
CREATE TABLE public.salespeople (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create targets table (per-person and per-team)
CREATE TABLE public.targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  salesperson_id UUID REFERENCES public.salespeople(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN ('calls', 'meetings', 'deals')),
  target_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bu_id, salesperson_id, metric)
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  salesperson_id UUID NOT NULL REFERENCES public.salespeople(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN ('calls', 'meetings', 'deals')),
  count INTEGER NOT NULL DEFAULT 1,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salespeople ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Public read/write access (no auth, shared link model)
CREATE POLICY "Anyone can read business_units" ON public.business_units FOR SELECT USING (true);
CREATE POLICY "Anyone can insert business_units" ON public.business_units FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update business_units" ON public.business_units FOR UPDATE USING (true);

CREATE POLICY "Anyone can read salespeople" ON public.salespeople FOR SELECT USING (true);
CREATE POLICY "Anyone can insert salespeople" ON public.salespeople FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update salespeople" ON public.salespeople FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete salespeople" ON public.salespeople FOR DELETE USING (true);

CREATE POLICY "Anyone can read targets" ON public.targets FOR SELECT USING (true);
CREATE POLICY "Anyone can insert targets" ON public.targets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update targets" ON public.targets FOR UPDATE USING (true);

CREATE POLICY "Anyone can read activity_logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_salespeople_bu ON public.salespeople(bu_id);
CREATE INDEX idx_activity_logs_bu ON public.activity_logs(bu_id);
CREATE INDEX idx_activity_logs_salesperson ON public.activity_logs(salesperson_id);
CREATE INDEX idx_targets_bu ON public.targets(bu_id);
