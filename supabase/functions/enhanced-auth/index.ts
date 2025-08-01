import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const body = await req.json()
    const { email, password, action, ip, userAgent, success, reason } = body

    if (action === 'check_lockout') {
      // Check if account is locked
      const { data: isLocked, error } = await supabase
        .rpc('is_account_locked', { user_email: email })
      
      if (error) throw error

      return new Response(
        JSON.stringify({ isLocked }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'handle_login_attempt') {

      // Log the attempt
      await supabase
        .from('login_attempts')
        .insert({
          email,
          success,
          failure_reason: reason,
          ip_address: ip,
          user_agent: userAgent
        })

      if (success) {
        // Handle successful login
        await supabase.rpc('handle_successful_login', { 
          user_email: email, 
          user_ip: ip 
        })
      } else {
        // Handle failed login
        await supabase.rpc('handle_failed_login', { 
          user_email: email, 
          user_ip: ip 
        })
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})