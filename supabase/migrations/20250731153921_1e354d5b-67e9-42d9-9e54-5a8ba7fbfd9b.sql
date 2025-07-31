-- Create security-related tables for advanced authentication features

-- Table for tracking login attempts and account lockouts
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  ip_address inet,
  success boolean NOT NULL DEFAULT false,
  failure_reason text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on login_attempts
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only administrators can view login attempts
CREATE POLICY "Only administrators can view login attempts" ON public.login_attempts
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'administrator');

-- Table for password history to prevent reuse
CREATE TABLE public.password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on password_history
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own password history (for validation)
CREATE POLICY "Users can view their own password history" ON public.password_history
  FOR SELECT USING (auth.uid() = user_id);

-- Only the system can insert password history records
CREATE POLICY "System can insert password history" ON public.password_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Table for security questions
CREATE TABLE public.security_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_1 text NOT NULL,
  answer_1_hash text NOT NULL,
  question_2 text NOT NULL,
  answer_2_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on security_questions
ALTER TABLE public.security_questions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own security questions
CREATE POLICY "Users can manage their own security questions" ON public.security_questions
  FOR ALL USING (auth.uid() = user_id);

-- Table for account lockouts
CREATE TABLE public.account_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  locked_until timestamptz NOT NULL,
  reason text NOT NULL DEFAULT 'Multiple failed login attempts',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on account_lockouts
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

-- Only administrators can view lockouts
CREATE POLICY "Only administrators can view lockouts" ON public.account_lockouts
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'administrator');

-- Add password change tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN password_changed_at timestamptz DEFAULT now(),
ADD COLUMN last_login_at timestamptz,
ADD COLUMN last_login_ip inet,
ADD COLUMN failed_login_count integer DEFAULT 0,
ADD COLUMN account_locked_until timestamptz;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lockout_record RECORD;
BEGIN
  -- Check for active lockout
  SELECT * INTO lockout_record 
  FROM public.account_lockouts 
  WHERE email = user_email 
    AND locked_until > now() 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  RETURN lockout_record IS NOT NULL;
END;
$$;

-- Function to lock account after failed attempts
CREATE OR REPLACE FUNCTION public.handle_failed_login(user_email text, user_ip inet DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_attempts integer;
  lockout_duration interval;
BEGIN
  -- Get current failed attempts
  SELECT COALESCE(failed_login_count, 0) INTO current_attempts
  FROM public.profiles 
  WHERE email = user_email;
  
  -- Increment failed attempts
  UPDATE public.profiles 
  SET failed_login_count = COALESCE(failed_login_count, 0) + 1
  WHERE email = user_email;
  
  -- Lock account if 5 or more failed attempts
  IF current_attempts >= 4 THEN
    -- Progressive lockout: 15 minutes for first lockout, 1 hour for subsequent
    lockout_duration := CASE 
      WHEN current_attempts = 4 THEN interval '15 minutes'
      ELSE interval '1 hour'
    END;
    
    -- Create lockout record
    INSERT INTO public.account_lockouts (email, locked_until)
    VALUES (user_email, now() + lockout_duration);
    
    -- Update profile lockout
    UPDATE public.profiles 
    SET account_locked_until = now() + lockout_duration
    WHERE email = user_email;
  END IF;
END;
$$;

-- Function to handle successful login
CREATE OR REPLACE FUNCTION public.handle_successful_login(user_email text, user_ip inet DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset failed login count and update last login
  UPDATE public.profiles 
  SET 
    failed_login_count = 0,
    account_locked_until = NULL,
    last_login_at = now(),
    last_login_ip = user_ip
  WHERE email = user_email;
  
  -- Clean up old lockout records for this user
  DELETE FROM public.account_lockouts 
  WHERE email = user_email AND locked_until <= now();
END;
$$;

-- Function to check password age
CREATE OR REPLACE FUNCTION public.can_change_password(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_change timestamptz;
BEGIN
  SELECT password_changed_at INTO last_change
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- Allow change if more than 24 hours have passed
  RETURN (last_change IS NULL OR last_change < now() - interval '1 day');
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_created_at ON public.login_attempts(created_at);
CREATE INDEX idx_password_history_user_id ON public.password_history(user_id);
CREATE INDEX idx_account_lockouts_email ON public.account_lockouts(email);
CREATE INDEX idx_account_lockouts_locked_until ON public.account_lockouts(locked_until);

-- Update timestamp trigger for security_questions
CREATE TRIGGER update_security_questions_updated_at
BEFORE UPDATE ON public.security_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();