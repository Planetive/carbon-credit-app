-- Create user profiles table for organizations/companies
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  organization_type TEXT, -- e.g., "Corporation", "NGO", "Government", "Startup"
  industry TEXT,
  country TEXT,
  website TEXT,
  contact_name TEXT,
  contact_role TEXT,
  phone TEXT,
  company_size TEXT, -- e.g., "1-10", "11-50", "51-200", "200+"
  annual_revenue TEXT,
  sustainability_goals TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_profile UNIQUE(user_id)
);

-- Create AI advisor sessions table
CREATE TABLE public.ai_advisor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_climate_goal TEXT NOT NULL,
  target_period_start TEXT NOT NULL,
  target_period_end TEXT NOT NULL,
  is_net_zero BOOLEAN DEFAULT false,
  investment_capacity TEXT NOT NULL,
  specific_budget TEXT,
  business_goals TEXT,
  constraints TEXT,
  suggestions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create global projects table
CREATE TABLE public.global_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "Registry" text,
  "Name" text,
  "Proponent" text,
  "Project Type" text,
  "Subcategory" text,
  "AFOLU" text,
  "Energy " text,  -- trailing space is preserved
  "Code" text,
  "Methodology" text,
  "Status" text,
  "Country/Area" text,
  "Estimated Annual Emission Reductions" numeric,
  "Region" text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advisor_session_id UUID REFERENCES public.ai_advisor_sessions(id) ON DELETE SET NULL,
  
  -- Project basic info
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  description TEXT NOT NULL,
  project_developer TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'submitted', 'analyzing', 'completed'
  
  -- Location & Geography
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  coordinates TEXT,
  land_area NUMERIC,
  land_use TEXT,
  
  -- Technology & Methodology
  methodology TEXT NOT NULL,
  technology TEXT NOT NULL,
  certification_standard TEXT NOT NULL,
  monitoring_plan TEXT NOT NULL,
  
  -- Financial Parameters
  initial_investment NUMERIC,
  operational_costs NUMERIC,
  credit_price NUMERIC,
  project_lifetime INTEGER,
  
  -- Environmental Impact
  carbon_sequestration NUMERIC NOT NULL,
  biodiversity_impact TEXT,
  water_impact TEXT,
  soil_impact TEXT,
  additional_benefits JSONB,
  
  -- Risk Assessment
  technical_risks TEXT,
  financial_risks TEXT,
  regulatory_risks TEXT,
  market_risks TEXT,
  mitigation_strategies TEXT,
  
  -- Timeline & Milestones
  start_date DATE,
  first_credit_date DATE,
  major_milestones TEXT,
  reporting_schedule TEXT,
  
  -- AI metadata
  is_ai_suggested BOOLEAN DEFAULT false,
  ai_suggestion_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project results table
CREATE TABLE public.project_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Analysis results
  overall_score NUMERIC NOT NULL,
  financial_viability_score NUMERIC NOT NULL,
  environmental_impact_score NUMERIC NOT NULL,
  risk_score NUMERIC NOT NULL,
  technical_feasibility_score NUMERIC NOT NULL,
  
  -- Detailed analysis
  strengths JSONB,
  weaknesses JSONB,
  opportunities JSONB,
  threats JSONB,
  recommendations JSONB,
  
  -- Financial projections
  projected_revenue JSONB,
  projected_costs JSONB,
  roi_analysis JSONB,
  payback_period NUMERIC,
  
  -- Environmental metrics
  total_carbon_impact NUMERIC,
  co_benefits_assessment JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_project_result UNIQUE(project_id)
);

-- Create project reports table
CREATE TABLE public.project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  report_type TEXT NOT NULL, -- 'feasibility', 'impact', 'financial', 'comprehensive'
  report_title TEXT NOT NULL,
  report_format TEXT NOT NULL, -- 'PDF', 'Excel', 'Web'
  report_data JSONB NOT NULL,
  file_url TEXT, -- For PDF/Excel exports
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_advisor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for AI advisor sessions
CREATE POLICY "Users can view their own advisor sessions" 
ON public.ai_advisor_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own advisor sessions" 
ON public.ai_advisor_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own advisor sessions" 
ON public.ai_advisor_sessions FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for projects
CREATE POLICY "Users can view their own projects" 
ON public.projects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" 
ON public.projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
ON public.projects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
ON public.projects FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for project results
CREATE POLICY "Users can view their own project results" 
ON public.project_results FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own project results" 
ON public.project_results FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project results" 
ON public.project_results FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for project reports
CREATE POLICY "Users can view their own project reports" 
ON public.project_reports FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own project reports" 
ON public.project_reports FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project reports" 
ON public.project_reports FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project reports" 
ON public.project_reports FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_advisor_sessions_updated_at
    BEFORE UPDATE ON public.ai_advisor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_results_updated_at
    BEFORE UPDATE ON public.project_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_reports_updated_at
    BEFORE UPDATE ON public.project_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, organization_name, contact_name)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data ->> 'organization_name', 'New Organization'),
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', 'Contact Name')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();