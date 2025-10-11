-- Create compliance_mechanisms table
CREATE TABLE public.compliance_mechanisms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "Name" text,
  "Instrument Type" text,
  "Status" text,
  "Country" text,
  "Region" text,
  "Price Rate" text,
  "Covered Gases" text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for compliance_mechanisms
ALTER TABLE public.compliance_mechanisms ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow read for all users (including unauthenticated)
CREATE POLICY "Allow read for all" ON public.compliance_mechanisms
FOR SELECT
USING (true);

-- RLS Policy: Allow insert/update/delete for authenticated users only
CREATE POLICY "Allow modify for authenticated" ON public.compliance_mechanisms
FOR ALL
USING (auth.role() = 'authenticated');

-- Create carbon_credit_markets table
CREATE TABLE public.carbon_credit_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "Carbon Credit Instrument" text,
  "Status" text,
  "Year of implementation" integer,
  "Country" text,
  "Region" text,
  "Price range" text,
  "Details" text,
  "Cummulative Credits Issued" text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for carbon_credit_markets
ALTER TABLE public.carbon_credit_markets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow read for all users (including unauthenticated)
CREATE POLICY "Allow read for all" ON public.carbon_credit_markets
FOR SELECT
USING (true);

-- RLS Policy: Allow insert/update/delete for authenticated users only
CREATE POLICY "Allow modify for authenticated" ON public.carbon_credit_markets
FOR ALL
USING (auth.role() = 'authenticated');