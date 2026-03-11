
-- 1. Organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all organizations" ON public.organizations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can view organizations" ON public.organizations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Teachers can manage own organizations" ON public.organizations FOR ALL TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid()) WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid());

-- 2. Organization contest codes (invite codes)
CREATE TABLE public.organization_contest_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  max_registrations INTEGER,
  registration_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'VND',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, contest_id)
);

ALTER TABLE public.organization_contest_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all codes" ON public.organization_contest_codes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can manage own contest codes" ON public.organization_contest_codes FOR ALL TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role) AND owns_contest(contest_id)) WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND owns_contest(contest_id));
CREATE POLICY "Anyone can read active codes" ON public.organization_contest_codes FOR SELECT USING (is_active = true);

-- 3. Contest registrations
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'free');
CREATE TYPE public.payment_method AS ENUM ('stripe', 'bank_transfer', 'free');

CREATE TABLE public.contest_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invite_code_id UUID NOT NULL REFERENCES public.organization_contest_codes(id) ON DELETE CASCADE,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method,
  payment_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'VND',
  stripe_payment_id TEXT,
  bank_transfer_proof TEXT,
  bank_transfer_note TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contest_id, user_id)
);

ALTER TABLE public.contest_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all registrations" ON public.contest_registrations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can view registrations for own contests" ON public.contest_registrations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role) AND owns_contest(contest_id));
CREATE POLICY "Teachers can update registrations for own contests" ON public.contest_registrations FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role) AND owns_contest(contest_id));
CREATE POLICY "Users can view own registrations" ON public.contest_registrations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own registrations" ON public.contest_registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_org_contest_codes_updated_at BEFORE UPDATE ON public.organization_contest_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contest_registrations_updated_at BEFORE UPDATE ON public.contest_registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
