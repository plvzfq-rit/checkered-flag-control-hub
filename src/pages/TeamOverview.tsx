import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Flag, 
  Clock, 
  Trophy,
  User,
  Settings
} from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  car_number: number | null;
  created_at: string;
  teams?: {
    name: string;
    full_name: string;
  };
}

interface TeamStats {
  totalSessions: number;
  totalPitStops: number;
  averageLapTime: number | null;
  teamMembers: TeamMember[];
}

const TeamOverview: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [teamStats, setTeamStats] = useState<TeamStats>({
    totalSessions: 0,
    totalPitStops: 0,
    averageLapTime: null,
    teamMembers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role && ['driver', 'race_engineer', 'team_principal', 'administrator'].includes(profile.role)) {
      fetchTeamData();
    }
  }, [profile]);

  const fetchTeamData = async () => {
    try {
      let membersQuery;
      
      if (profile?.role === 'administrator') {
        // Administrators can see all users
        membersQuery = supabase
          .from('profiles')
          .select(`
            id, full_name, email, role, car_number, created_at,
            teams (
              name,
              full_name
            )
          `)
          .order('role', { ascending: true })
          .order('full_name', { ascending: true });
      } else {
        // Others see only their team
        membersQuery = supabase
          .from('profiles')
          .select(`
            id, full_name, email, role, car_number, created_at, team_id,
            teams (
              name,
              full_name
            )
          `)
          .eq('team_id', profile?.team_id)
          .order('role', { ascending: true })
          .order('full_name', { ascending: true });
      }

      const { data: members, error: membersError } = await membersQuery;

      // Fetch team sessions
      const memberIds = members?.map(m => m.id) || [];
      const { data: sessions, error: sessionsError } = await supabase
        .from('race_sessions')
        .select('lap_time')
        .in('user_id', memberIds);

      if (sessionsError) throw sessionsError;

      // Fetch team pit stops
      const { count: pitStopsCount, error: pitStopsError } = await supabase
        .from('pit_stops')
        .select('*', { count: 'exact', head: true })
        .in('user_id', memberIds);

      if (pitStopsError) throw pitStopsError;

      // Calculate average lap time
      const validLapTimes = sessions?.filter(s => s.lap_time).map(s => s.lap_time) || [];
      const averageLapTime = validLapTimes.length > 0 
        ? validLapTimes.reduce((a, b) => a + b, 0) / validLapTimes.length 
        : null;

      setTeamStats({
        totalSessions: sessions?.length || 0,
        totalPitStops: pitStopsCount || 0,
        averageLapTime,
        teamMembers: members || []
      });
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch team data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'team_principal':
        return 'bg-red-600 hover:bg-red-700';
      case 'race_engineer':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'driver':
        return 'bg-green-600 hover:bg-green-700';
      case 'administrator':
        return 'bg-purple-600 hover:bg-purple-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'team_principal':
        return 'Team Principal';
      case 'race_engineer':
        return 'Race Engineer';
      case 'driver':
        return 'Driver';
      case 'administrator':
        return 'Administrator';
      default:
        return role;
    }
  };

  const groupMembersByRole = (members: TeamMember[]) => {
    const grouped = members.reduce((acc, member) => {
      if (!acc[member.role]) {
        acc[member.role] = [];
      }
      acc[member.role].push(member);
      return acc;
    }, {} as Record<string, TeamMember[]>);

    // Sort roles by hierarchy
    const roleOrder = ['administrator', 'team_principal', 'race_engineer', 'driver'];
    const sortedGroups: Record<string, TeamMember[]> = {};
    roleOrder.forEach(role => {
      if (grouped[role]) {
        sortedGroups[role] = grouped[role];
      }
    });

    return sortedGroups;
  };

  if (!profile || !['driver', 'race_engineer', 'team_principal', 'administrator'].includes(profile.role)) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to view team overview.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-lg">Loading team data...</div>
      </div>
    );
  }

  const groupedMembers = groupMembersByRole(teamStats.teamMembers);
  const pageTitle = profile.role === 'administrator' ? 'System Overview' : 'Team Overview';
  const pageSubtitle = profile.role === 'administrator' ? 'All users and system performance' : 'Team performance and member overview';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Trophy className="h-8 w-8 mr-3 text-yellow-400" />
          {pageTitle}
        </h1>
        <p className="text-gray-400 mt-2">
          {pageSubtitle}
        </p>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800/80 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Total Sessions</CardTitle>
              <Flag className="h-5 w-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{teamStats.totalSessions}</div>
            <p className="text-gray-400 text-sm">Sessions recorded</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Average Lap Time</CardTitle>
              <Clock className="h-5 w-5 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {teamStats.averageLapTime 
                ? `${teamStats.averageLapTime.toFixed(3)}s` 
                : '-'
              }
            </div>
            <p className="text-gray-400 text-sm">Average performance</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Total Pit Stops</CardTitle>
              <Settings className="h-5 w-5 text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{teamStats.totalPitStops}</div>
            <p className="text-gray-400 text-sm">Pit stops logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members by Role */}
      <div className="space-y-6">
        {Object.entries(groupedMembers).map(([role, members]) => (
          <Card key={role} className="bg-gray-800/80 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-400" />
                {getRoleDisplayName(role)}s ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <div key={member.id} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">{member.full_name}</h3>
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {getRoleDisplayName(member.role)}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{member.email}</p>
                    {member.teams && (
                      <p className="text-blue-400 text-sm mb-2">{member.teams.name}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      {member.car_number && (
                        <span className="text-red-400 font-bold">#{member.car_number}</span>
                      )}
                      <span className="text-gray-500">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teamStats.teamMembers.length === 0 && (
        <Card className="bg-gray-800/80 border-gray-700">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No team members found</p>
            {profile.role !== 'administrator' && (
              <p className="text-gray-500 text-sm mt-2">
                Make sure your team is set correctly in your profile
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamOverview;
