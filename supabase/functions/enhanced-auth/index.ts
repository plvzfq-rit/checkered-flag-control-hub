import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log('Function called with method:', req.method);

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json();
        console.log('Request body:', body);

        const { email, password, action, ip, userAgent, success, reason } = body;

        if (!action) {
            throw new Error('Action is required');
        }

        console.log('Processing action:', action);

        if (action === 'test') {
            return new Response(JSON.stringify({
                message: 'Function is working!',
                timestamp: new Date().toISOString()
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'check_profile') {
            // Check if profile exists for email
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();

            return new Response(JSON.stringify({
                profile,
                error: error?.message,
                exists: !!profile
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'test_failed_login') {
            // Test the handle_failed_login function directly
            console.log('Testing handle_failed_login for:', email);

            const result = await supabase.rpc('handle_failed_login', {
                user_email: email,
                user_ip: ip || '0.0.0.0',
            });

            console.log('Test result:', result);

            // Get the updated profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();

            return new Response(JSON.stringify({
                result,
                profile,
                error: result.error?.message
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'check_lockout') {
            // Check if account is locked
            const { data: isLocked, error } = await supabase.rpc(
                'is_account_locked',
                { user_email: email },
            );

            if (error) {
                console.error('check_lockout error.');
                throw error;
            }

            return new Response(JSON.stringify({ isLocked }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'test_reset_user') {
            // Test the handle_successful_login function directly
            console.log('Testing handle_successful_login for:', email);

            // First, get the current profile state
            const { data: beforeProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();

            console.log('Before reset:', beforeProfile);

            // Call the successful login function directly
            const result = await supabase.rpc('handle_successful_login', {
                user_email: email,
                user_ip: 'test'
            });

            console.log('Reset function result:', result);

            // Get the updated profile
            const { data: afterProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();

            console.log('After reset:', afterProfile);

            // Also test the SQL function directly
            const sqlResult = await supabase.rpc('test_reset_user', {
                user_email: email
            });

            return new Response(JSON.stringify({
                beforeProfile,
                afterProfile,
                result,
                sqlResult,
                error: result.error?.message
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'debug_user_state') {
            // Debug function to check all user state
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();

            const { data: lockoutData, error: lockoutError } = await supabase
                .from('account_lockouts')
                .select('*')
                .eq('email', email)
                .gte('locked_until', new Date().toISOString());

            return new Response(JSON.stringify({
                profile: profileData,
                profileError,
                lockouts: lockoutData,
                lockoutError,
                currentTime: new Date().toISOString()
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'verify_current_password') {
            console.log('Verifying current password for:', email);

            try {
                // Create a new client with service role to verify password without affecting user session
                const serviceClient = createClient(supabaseUrl, supabaseKey);

                // Attempt to sign in with the provided password
                const { data: signInData, error: signInError } = await serviceClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (signInError) {
                    console.log('Password verification failed:', signInError.message);
                    return new Response(JSON.stringify({
                        isValid: false,
                        error: signInError.message
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                console.log('Password verification successful');
                return new Response(JSON.stringify({
                    isValid: true
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            } catch (error) {
                console.error('Password verification error.');
                return new Response(JSON.stringify({
                    isValid: false,
                    error: error.message
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        if (action === 'handle_login_attempt') {
            console.log('Handling login attempt:', { email, success, reason });

            // Log the attempt
            const insertResult = await supabase.from('login_attempts').insert({
                email,
                success,
                failure_reason: reason,
                ip_address: ip,
                user_agent: userAgent,
            });
            console.log('Login attempt inserted:', insertResult);

            if (success) {
                console.log('Handling successful login for:', email);
                // Handle successful login
                const successResult = await supabase.rpc('handle_successful_login', {
                    user_email: email,
                    user_ip: ip || '0.0.0.0',
                });
                console.log('Successful login handled:', successResult);
                if (successResult.error) {
                    console.error('Success function error.');
                }
            } else {
                console.log('Handling failed login for:', email);

                // First, ensure profile exists
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', email)
                    .single();

                if (!existingProfile) {
                    console.log('No profile found, creating one for:', email);
                    // Create a basic profile record
                    await supabase.from('profiles').insert({
                        email: email,
                        failed_login_count: 0,
                        role: 'driver' // Default role
                    });
                }

                // Handle failed login
                const failResult = await supabase.rpc('handle_failed_login', {
                    user_email: email,
                    user_ip: ip || '0.0.0.0',
                });
                console.log('Failed login handled:', failResult);
                if (failResult.error) {
                    console.error('Failed login function error.');
                }
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Function error.');
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

