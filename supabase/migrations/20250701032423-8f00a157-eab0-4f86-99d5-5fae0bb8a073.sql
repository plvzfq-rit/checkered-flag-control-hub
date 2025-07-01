
-- Create the teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,          -- Common name (e.g., 'Red Bull')
  full_name text NOT NULL,            -- Official/formal name (e.g., 'Oracle Red Bull Racing')
  short_code text UNIQUE,             -- Optional: abbreviation like 'RBR'
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Only administrators can manage teams
CREATE POLICY "Only administrators can view teams" ON public.teams
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'administrator');

CREATE POLICY "Only administrators can insert teams" ON public.teams
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'administrator');

CREATE POLICY "Only administrators can update teams" ON public.teams
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'administrator');

CREATE POLICY "Only administrators can delete teams" ON public.teams
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'administrator');

-- Add team_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN team_id uuid REFERENCES public.teams(id);

-- Create a security definer function to get user's team_id
CREATE OR REPLACE FUNCTION public.get_user_team_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT team_id FROM public.profiles WHERE id = user_uuid
$$;

-- Update existing policies to use team_id instead of team_name

-- Drop old team-based policies
DROP POLICY IF EXISTS "Drivers can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Drivers can view team sessions" ON public.race_sessions;
DROP POLICY IF EXISTS "Drivers can view team pit stops" ON public.pit_stops;

-- Create new team_id-based policies for profiles
CREATE POLICY "Drivers can view team profiles by team_id" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'driver' AND 
    team_id = public.get_user_team_id(auth.uid()) AND
    team_id IS NOT NULL
  );

-- Create new team_id-based policies for race_sessions
CREATE POLICY "Drivers can view team sessions by team_id" ON public.race_sessions
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'driver' AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE team_id = public.get_user_team_id(auth.uid()) AND team_id IS NOT NULL
    )
  );

-- Create new team_id-based policies for pit_stops
CREATE POLICY "Drivers can view team pit stops by team_id" ON public.pit_stops
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'driver' AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE team_id = public.get_user_team_id(auth.uid()) AND team_id IS NOT NULL
    )
  );

-- Update race engineer policies to use team_id
DROP POLICY IF EXISTS "Race engineers can edit team sessions" ON public.race_sessions;
CREATE POLICY "Race engineers can edit team sessions by team_id" ON public.race_sessions
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'race_engineer' AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE team_id = public.get_user_team_id(auth.uid()) AND team_id IS NOT NULL
    )
  );

-- Update team principal policies to use team_id
DROP POLICY IF EXISTS "Team principals and admins can create sessions" ON public.race_sessions;
CREATE POLICY "Team principals and admins can create sessions by team_id" ON public.race_sessions
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('team_principal', 'administrator') AND
    (public.get_user_role(auth.uid()) = 'administrator' OR 
     user_id IN (
       SELECT id FROM public.profiles 
       WHERE team_id = public.get_user_team_id(auth.uid()) AND team_id IS NOT NULL
     ))
  );

DROP POLICY IF EXISTS "Team principals and admins can delete sessions" ON public.race_sessions;
CREATE POLICY "Team principals and admins can delete sessions by team_id" ON public.race_sessions
  FOR DELETE USING (
    public.get_user_role(auth.uid()) IN ('team_principal', 'administrator') AND
    (public.get_user_role(auth.uid()) = 'administrator' OR 
     user_id IN (
       SELECT id FROM public.profiles 
       WHERE team_id = public.get_user_team_id(auth.uid()) AND team_id IS NOT NULL
     ))
  );

-- Insert some initial teams to populate the table
INSERT INTO public.teams (name, full_name, short_code) VALUES 
  ('Red Bull Racing', 'Oracle Red Bull Racing', 'RBR'),
  ('Ferrari', 'Scuderia Ferrari', 'FER'),
  ('Mercedes', 'Mercedes-AMG Petronas F1 Team', 'MER'),
  ('McLaren', 'McLaren Formula 1 Team', 'MCL'),
  ('Alpine', 'BWT Alpine F1 Team', 'ALP'),
  ('Aston Martin', 'Aston Martin Aramco F1 Team', 'AMR'),
  ('Williams', 'Williams Racing', 'WIL'),
  ('AlphaTauri', 'Scuderia AlphaTauri', 'AT'),
  ('Alfa Romeo', 'Alfa Romeo F1 Team Stake', 'ARB'),
  ('Haas', 'MoneyGram Haas F1 Team', 'HAS');
