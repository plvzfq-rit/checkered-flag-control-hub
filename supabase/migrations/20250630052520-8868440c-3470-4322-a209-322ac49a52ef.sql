
-- Create new policies for Administrator role

-- Administrators can view all profiles
CREATE POLICY "Administrators can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'administrator');

-- Administrators can manage all profiles
CREATE POLICY "Administrators can manage all profiles" ON public.profiles
  FOR ALL USING (public.get_user_role(auth.uid()) = 'administrator');

-- Administrators can view all race sessions
CREATE POLICY "Administrators can view all sessions" ON public.race_sessions
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'administrator');

-- Administrators can manage all race sessions  
CREATE POLICY "Administrators can manage all sessions" ON public.race_sessions
  FOR ALL USING (public.get_user_role(auth.uid()) = 'administrator');

-- Administrators can view all pit stops
CREATE POLICY "Administrators can view all pit stops" ON public.pit_stops
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'administrator');

-- Administrators can manage all pit stops
CREATE POLICY "Administrators can manage all pit stops" ON public.pit_stops
  FOR ALL USING (public.get_user_role(auth.uid()) = 'administrator');

-- Administrators can view all audit logs
CREATE POLICY "Administrators can view all audit logs" ON public.audit_logs
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'administrator');

-- Update existing policies to allow drivers to view team overview
CREATE POLICY "Drivers can view team profiles" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'driver' AND 
    team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
  );

-- Allow drivers to view team sessions for team overview
CREATE POLICY "Drivers can view team sessions" ON public.race_sessions
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'driver' AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Allow drivers to view team pit stops for team overview
CREATE POLICY "Drivers can view team pit stops" ON public.pit_stops
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'driver' AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Restrict race engineers from creating sessions (only team principals and administrators can)
DROP POLICY IF EXISTS "Race engineers can manage team sessions" ON public.race_sessions;

CREATE POLICY "Race engineers can edit team sessions" ON public.race_sessions
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'race_engineer' AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Only team principals and administrators can create sessions
CREATE POLICY "Team principals and admins can create sessions" ON public.race_sessions
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('team_principal', 'administrator') AND
    (public.get_user_role(auth.uid()) = 'administrator' OR 
     user_id IN (
       SELECT id FROM public.profiles 
       WHERE team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
     ))
  );

-- Only team principals and administrators can delete sessions
CREATE POLICY "Team principals and admins can delete sessions" ON public.race_sessions
  FOR DELETE USING (
    public.get_user_role(auth.uid()) IN ('team_principal', 'administrator') AND
    (public.get_user_role(auth.uid()) = 'administrator' OR 
     user_id IN (
       SELECT id FROM public.profiles 
       WHERE team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
     ))
  );
