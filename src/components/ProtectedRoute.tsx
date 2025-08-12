
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Test if access_failure table exists
  useEffect(() => {
    const testTableExists = async () => {
      try {
        const { data, error } = await supabase
          .from('access_failure')
          .select('*')
          .limit(1);

        if (error) {
          console.error('Access failure table test error.');
        }
      } catch (error) {
        //console.error('Failed to test access_failure table:', error);
      }
    };

    testTableExists();
  }, []);

  // Log access control failures only for audit route
  useEffect(() => {
    const logAccessFailure = async (reason: string) => {
      if (user && profile) {
        try {
          const detailedReason = requiredRoles
            ? `${reason} - Path: ${location.pathname}, User Role: ${profile.role}, Required Roles: ${requiredRoles.join(', ')}`
            : `${reason} - Path: ${location.pathname}, User Role: ${profile.role}`;

          console.log('Attempting to log access failure:', {
            user_id: user.id,
            reason: detailedReason,
            path: location.pathname
          });

          const { data, error } = await supabase
            .from('access_failure')
            .insert({
              user_id: user.id,
              reason: detailedReason
            });

          if (error) {
            console.error('Supabase error logging access failure.');
          } else {
            console.log('Successfully logged access failure:', data);
          }
        } catch (error) {
          console.error('Failed to log access failure.');
        }
      }
    };

    // Log unauthorized access attempts for protected routes
    if (!loading && user && profile && requiredRoles && !requiredRoles.includes(profile.role)) {
      // Define protected routes and their required roles
      const protectedRoutes = {
        '/audit': ['team_principal', 'administrator'],
        '/pit-stops': ['race_engineer', 'team_principal', 'administrator'],
        '/sessions/create': ['team_principal', 'administrator'],
        '/users': ['administrator']
      };

      // Check if current path is a protected route (exact match)
      if (protectedRoutes[location.pathname as keyof typeof protectedRoutes]) {
        console.log(`Unauthorized access attempt detected for ${location.pathname} route`);
        logAccessFailure('Unauthorized route access attempt');
      }

      // Check for dynamic routes (like /sessions/edit/:id)
      if (location.pathname.startsWith('/sessions/edit/')) {
        console.log(`Unauthorized access attempt detected for session edit route`);
        logAccessFailure('Unauthorized route access attempt');
      }
    }
  }, [user, profile, loading, requiredRoles, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRoles && profile && !requiredRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access this area.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
