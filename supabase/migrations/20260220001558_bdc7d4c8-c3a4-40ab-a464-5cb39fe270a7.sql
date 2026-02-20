
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('agent', 'shiftlead');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles: users can read their own roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Phases table
CREATE TABLE public.phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ
);
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read phases" ON public.phases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ShiftLead can insert phases" ON public.phases
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'shiftlead'));

CREATE POLICY "ShiftLead can update phases" ON public.phases
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'shiftlead'));

-- Issue types table
CREATE TABLE public.issue_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);
ALTER TABLE public.issue_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read issue_types" ON public.issue_types
  FOR SELECT TO authenticated USING (true);

-- Feedbacks table
CREATE TABLE public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID REFERENCES public.phases(id) NOT NULL,
    issue_type TEXT NOT NULL,
    city TEXT,
    center_name TEXT,
    customer_id TEXT,
    customer_ip TEXT,
    sim_card_number TEXT,
    connected_operator TEXT,
    area TEXT,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_mobile_issue BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read feedbacks" ON public.feedbacks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert feedbacks" ON public.feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Indexes
CREATE INDEX idx_feedbacks_created_at ON public.feedbacks(created_at);
CREATE INDEX idx_feedbacks_phase_id ON public.feedbacks(phase_id);
CREATE INDEX idx_feedbacks_issue_type ON public.feedbacks(issue_type);
CREATE INDEX idx_feedbacks_city ON public.feedbacks(city);

-- Enable realtime for feedbacks
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedbacks;
