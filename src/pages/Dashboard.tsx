
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Clock, 
  Flag, 
  Users, 
  BarChart3, 
  Settings, 
  Shield,
  Activity
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalPitStops: 0,
    totalUsers: 0,
    recentSessions: [],
  });

  useEffect(() => {
    fetchDashboardStats();
  }, [profile]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch sessions count
      const { count: sessionsCount } = await supabase
        .from('race_sessions')
        .select('*', { count: 'exact', head: true });

      // Fetch pit stops count
      const { count: pitStopsCount } = await supabase
        .from('pit_stops')
        .select('*', { count: 'exact', head: true });

      // Fetch recent sessions
      const { data: recentSessions } = await supabase
        .from('race_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch users count (only for team principals, race engineers, and administrators)
      let usersCount = 0;
      if (profile?.role === 'team_principal' || profile?.role === 'race_engineer' || profile?.role === 'administrator') {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        usersCount = count || 0;
      }

      setStats({
        totalSessions: sessionsCount || 0,
        totalPitStops: pitStopsCount || 0,
        totalUsers: usersCount,
        recentSessions: recentSessions || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };



  const getQuickActions = () => {
    const actions = [];

    // Pit stops for race engineers, team principals, and administrators
    if (['race_engineer', 'team_principal', 'administrator'].includes(profile?.role || '')) {
      actions.push({
        title: 'Pit Stops',
        description: 'Manage pit stop data',
        icon: Clock,
        onClick: () => navigate('/pit-stops'),
        color: 'bg-orange-600 hover:bg-orange-700',
      });
    }

    // Session creation only for team principals and administrators
    if (['team_principal', 'administrator'].includes(profile?.role || '')) {
      actions.push({
        title: 'New Race Session',
        description: 'Record lap times and session data',
        icon: Plus,
        onClick: () => navigate('/sessions/create'),
        color: 'bg-green-600 hover:bg-green-700',
      });
    }

    // View sessions for all users
    actions.push({
      title: 'View Sessions',
      description: 'Browse race sessions',
      icon: Flag,
      onClick: () => navigate('/sessions'),
      color: 'bg-blue-600 hover:bg-blue-700',
    });

    // User management only for administrators
    if (profile?.role === 'administrator') {
      actions.push({
        title: 'Manage Users',
        description: 'Add and manage all users',
        icon: Users,
        onClick: () => navigate('/users'),
        color: 'bg-red-600 hover:bg-red-700',
      });
    }
    
    // Audit logs for team principals and administrators
    if (['team_principal', 'administrator'].includes(profile?.role || '')) {
      actions.push({
        title: 'Audit Logs',
        description: 'View system activity logs',
        icon: Shield,
        onClick: () => navigate('/audit'),
        color: 'bg-purple-600 hover:bg-purple-700',
      });
    }

    // Team overview for drivers, race engineers, team principals, and administrators
    if (['driver', 'race_engineer', 'team_principal', 'administrator'].includes(profile?.role || '')) {
      actions.push({
        title: 'Team Overview',
        description: profile?.role === 'administrator' ? 'View system overview' : 'View team performance and members',
        icon: BarChart3,
        onClick: () => navigate('/team-overview'),
        color: 'bg-indigo-600 hover:bg-indigo-700',
      });
    }

    return actions;
  };

  const getRoleWelcomeMessage = () => {
    switch (profile?.role) {
      case 'administrator':
        return 'Managing the entire system';
      case 'team_principal':
        return 'Leading the team to victory';
      case 'race_engineer':
        return 'Optimizing performance on track';
      case 'driver':
        return 'Ready to hit the track';
      default:
        return 'Welcome to the racing platform';
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {profile.full_name}!
          </h1>
          <p className="text-gray-400 mt-2">
            {getRoleWelcomeMessage()}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800/80 border-gray-700 hover:bg-gray-800/90 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Race Sessions</CardTitle>
              <Flag className="h-5 w-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalSessions}</div>
            <p className="text-gray-400 text-sm">
              {profile.role === 'administrator' ? 'Total system sessions' : 'Total sessions recorded'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700 hover:bg-gray-800/90 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Pit Stops</CardTitle>
              <Clock className="h-5 w-5 text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalPitStops}</div>
            <p className="text-gray-400 text-sm">
              {profile.role === 'administrator' ? 'Total system pit stops' : 'Total pit stops logged'}
            </p>
          </CardContent>
        </Card>

        {(profile.role === 'team_principal' || profile.role === 'race_engineer' || profile.role === 'administrator') && (
          <Card className="bg-gray-800/80 border-gray-700 hover:bg-gray-800/90 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white">
                  {profile.role === 'administrator' ? 'Total Users' : 'Team Members'}
                </CardTitle>
                <Users className="h-5 w-5 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
              <p className="text-gray-400 text-sm">
                {profile.role === 'administrator' ? 'Active system users' : 'Active team members'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-red-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getQuickActions().map((action, index) => (
            <Card 
              key={index} 
              className="bg-gray-800/80 border-gray-700 hover:bg-gray-700/80 transition-colors cursor-pointer"
              onClick={action.onClick}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{action.title}</h3>
                    <p className="text-sm text-gray-400">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Sessions</h2>
        <div className="space-y-3">
          {stats.recentSessions.length > 0 ? (
            stats.recentSessions.map((session: any) => (
              <Card key={session.id} className="bg-gray-800/80 border-gray-700 hover:bg-gray-800/90 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="border-blue-600 text-blue-400">
                        {session.session_type.toUpperCase()}
                      </Badge>
                      <span className="text-white font-medium">{session.track_name}</span>
                      {session.lap_time && (
                        <span className="text-green-400 font-mono">
                          {session.lap_time}s
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm">
                      {new Date(session.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-gray-800/80 border-gray-700">
              <CardContent className="p-6 text-center">
                <p className="text-gray-400">No recent sessions found</p>
                {['team_principal', 'administrator'].includes(profile?.role || '') && (
                  <Button
                    onClick={() => navigate('/sessions/create')}
                    className="mt-4 bg-green-600 hover:bg-green-700"
                  >
                    Create Your First Session
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
