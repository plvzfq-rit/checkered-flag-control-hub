-- Drop the old function that uses 'inet' parameter type
DROP FUNCTION IF EXISTS handle_failed_login(user_email text, user_ip inet);

-- Drop the old function that uses 'inet' parameter type for successful login too
DROP FUNCTION IF EXISTS handle_successful_login(user_email text, user_ip inet);

-- Drop the old is_account_locked function
DROP FUNCTION IF EXISTS is_account_locked(text);

-- Now create the new functions with 'text' parameter types
CREATE OR REPLACE FUNCTION handle_failed_login(user_email text, user_ip text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_exists boolean;
    new_attempts integer;
    lockout_duration interval;
BEGIN
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE email = user_email) INTO profile_exists;
    
    -- Create profile if it doesn't exist
    IF NOT profile_exists THEN
        INSERT INTO profiles (email, failed_login_count, role)
        VALUES (user_email, 0, 'driver');
    END IF;
    
    -- INCREMENT the existing value and get the NEW count
    UPDATE profiles
    SET failed_login_count = COALESCE(failed_login_count, 0) + 1
    WHERE email = user_email
    RETURNING failed_login_count INTO new_attempts;
    
    -- Lock account if 5 or more failed attempts (check the NEW count)
    IF new_attempts >= 5 THEN
        -- Progressive lockout: 15 minutes for first lockout, 1 hour for subsequent
        lockout_duration := CASE 
            WHEN new_attempts = 5 THEN interval '15 minutes'
            ELSE interval '1 hour'
        END;
        
        -- Create lockout record
        INSERT INTO account_lockouts (email, locked_until)
        VALUES (user_email, now() + lockout_duration);
        
        -- Update profile lockout
        UPDATE profiles 
        SET account_locked_until = now() + lockout_duration
        WHERE email = user_email;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION handle_successful_login(user_email text, user_ip text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rows_affected integer;
    profile_exists boolean;
BEGIN
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE email = user_email) INTO profile_exists;
    RAISE NOTICE 'handle_successful_login: Profile exists for %: %', user_email, profile_exists;
    
    -- Reset failed login count and update last login
    UPDATE profiles 
    SET 
        failed_login_count = 0,
        account_locked_until = NULL,
        last_login_at = now(),
        last_login_ip = user_ip::inet
    WHERE email = user_email;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Log the update (this will appear in Supabase logs)
    RAISE NOTICE 'handle_successful_login: Updated % rows for email %', rows_affected, user_email;
    
    -- Clean up old lockout records for this user
    DELETE FROM account_lockouts 
    WHERE email = user_email AND locked_until <= now();
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RAISE NOTICE 'handle_successful_login: Deleted % lockout records for email %', rows_affected, user_email;
END;
$$;

-- Updated is_account_locked function that focuses on time-based lockouts
CREATE OR REPLACE FUNCTION is_account_locked(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    lockout_until timestamp with time zone;
BEGIN
    -- Check if there's an active lockout period
    SELECT account_locked_until INTO lockout_until
    FROM profiles 
    WHERE email = user_email;
    
    -- If lockout time has expired, automatically unlock the account
    IF lockout_until IS NOT NULL AND lockout_until <= NOW() THEN
        -- Clear the lockout and reset failed attempts
        UPDATE profiles 
        SET 
            account_locked_until = NULL,
            failed_login_count = 0
        WHERE email = user_email;
        
        -- Clean up expired lockout records
        DELETE FROM account_lockouts 
        WHERE email = user_email AND locked_until <= NOW();
        
        RETURN false; -- Account is now unlocked
    END IF;
    
    -- If there's a lockout time and it's still in the future, account is locked
    IF lockout_until IS NOT NULL AND lockout_until > NOW() THEN
        RETURN true;
    END IF;
    
    -- No active lockout, account is not locked
    RETURN false;
END;
$$;

-- Test function to manually reset a user's failed attempts
CREATE OR REPLACE FUNCTION test_reset_user(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    before_count integer;
    after_count integer;
    profile_exists boolean;
BEGIN
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE email = user_email) INTO profile_exists;
    
    IF NOT profile_exists THEN
        RETURN 'Profile does not exist for this email';
    END IF;
    
    -- Get current failed attempts
    SELECT COALESCE(failed_login_count, 0) INTO before_count
    FROM profiles 
    WHERE email = user_email;
    
    -- Call the successful login function
    PERFORM handle_successful_login(user_email, 'test');
    
    -- Get new failed attempts count
    SELECT COALESCE(failed_login_count, 0) INTO after_count
    FROM profiles 
    WHERE email = user_email;
    
    RETURN format('Before: %s, After: %s', before_count, after_count);
END;
$$; 