
-- Create user roles enum with F1-themed names
CREATE TYPE public.user_role AS ENUM ('team_principal', 'race_engineer', 'driver');

-- Create profiles table to store user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'driver',
  team_name TEXT,
  car_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create race sessions table (our main "transactions")
CREATE TABLE public.race_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('practice', 'qualifying', 'race', 'testing')),
  track_name TEXT NOT NULL,
  lap_time NUMERIC(5,3), -- e.g., 87.234 seconds
  sector_1 NUMERIC(5,3),
  sector_2 NUMERIC(5,3),
  sector_3 NUMERIC(5,3),
  tire_compound TEXT CHECK (tire_compound IN ('soft', 'medium', 'hard', 'intermediate', 'wet')),
  fuel_load NUMERIC(4,1), -- in kg
  weather_conditions TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create pit stops table
CREATE TABLE public.pit_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.race_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  pit_time NUMERIC(4,2), -- pit stop duration in seconds
  tire_change_from TEXT,
  tire_change_to TEXT,
  fuel_added NUMERIC(4,1),
  lap_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create audit logs table for comprehensive tracking
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pit_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = user_uuid;
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Team principals can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'team_principal');

CREATE POLICY "Team principals can create profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'team_principal');

CREATE POLICY "Race engineers can view driver profiles" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'race_engineer' AND 
    role = 'driver'
  );

-- Race sessions policies
CREATE POLICY "Users can view their own sessions" ON public.race_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON public.race_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.race_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON public.race_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Race engineers can manage all sessions" ON public.race_sessions
  FOR ALL USING (public.get_user_role(auth.uid()) = 'race_engineer');

CREATE POLICY "Team principals can view all sessions" ON public.race_sessions
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'team_principal');

-- Pit stops policies
CREATE POLICY "Users can view their own pit stops" ON public.pit_stops
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pit stops" ON public.pit_stops
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Race engineers can manage all pit stops" ON public.pit_stops
  FOR ALL USING (public.get_user_role(auth.uid()) = 'race_engineer');

CREATE POLICY "Team principals can view all pit stops" ON public.pit_stops
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'team_principal');

-- Audit logs policies (only team principals can view)
CREATE POLICY "Only team principals can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'team_principal');

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    'driver'::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.audit_trigger();

CREATE TRIGGER audit_race_sessions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.race_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.audit_trigger();

CREATE TRIGGER audit_pit_stops_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.pit_stops
  FOR EACH ROW EXECUTE PROCEDURE public.audit_trigger();
