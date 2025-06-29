
-- Add foreign key constraint for audit_logs user_id to profiles
ALTER TABLE public.audit_logs
ADD CONSTRAINT fk_audit_user
FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- Update profiles policies to be team-based
DROP POLICY IF EXISTS "Team principals can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team principals can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Race engineers can view driver profiles" ON public.profiles;

-- New team-based policies for profiles
CREATE POLICY "Team principals can view team profiles" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'team_principal' AND 
    team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team principals can create team profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) = 'team_principal' AND
    team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Race engineers can view team driver profiles" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'race_engineer' AND 
    role = 'driver' AND
    team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
  );

-- Update race sessions policies to be team-based for Race Engineers
DROP POLICY IF EXISTS "Race engineers can manage all sessions" ON public.race_sessions;

CREATE POLICY "Race engineers can manage team sessions" ON public.race_sessions
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'race_engineer' AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Update race sessions policies for Team Principals to be team-based
DROP POLICY IF EXISTS "Team principals can view all sessions" ON public.race_sessions;

CREATE POLICY "Team principals can view team sessions" ON public.race_sessions
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'team_principal' AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Update pit stops policies to be team-based
DROP POLICY IF EXISTS "Race engineers can manage all pit stops" ON public.pit_stops;
DROP POLICY IF EXISTS "Team principals can view all pit stops" ON public.pit_stops;

CREATE POLICY "Race engineers can manage team pit stops" ON public.pit_stops
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'race_engineer' AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Team principals can view team pit stops" ON public.pit_stops
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'team_principal' AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Update audit logs policy to be team-based
DROP POLICY IF EXISTS "Only team principals can view audit logs" ON public.audit_logs;

CREATE POLICY "Team principals can view team audit logs" ON public.audit_logs
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'team_principal' AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE team_name = (SELECT team_name FROM public.profiles WHERE id = auth.uid())
    )
  );
