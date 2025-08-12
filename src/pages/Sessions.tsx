
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Flag, Clock, User } from 'lucide-react';

interface RaceSession {
  id: string;
  session_type: string;
  track_name: string;
  lap_time: number | null;
  tire_compound: string | null;
  weather_conditions: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    team_id: string | null;
    car_number: number | null;
    teams?: {
      name: string;
    };
  };
}

const Sessions: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<RaceSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [profile]);

  const fetchSessions = async () => {
    try {
      let query = supabase
        .from('race_sessions')
        .select(`
          *,
          profiles (
            full_name,
            team_id,
            car_number,
            teams (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Drivers can only see their own sessions
      if (profile?.role === 'driver') {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions.');
      toast({
        title: "Error",
        description: "Failed to fetch sessions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const { error } = await supabase
        .from('race_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Session deleted successfully"
      });

      fetchSessions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive"
      });
    }
  };

  const canCreateSessions = () => {
    return profile?.role === 'team_principal' || profile?.role === 'administrator';
  };

  const canEditSessions = () => {
    return profile?.role === 'race_engineer' || profile?.role === 'team_principal' || profile?.role === 'administrator';
  };

  const canDeleteSessions = () => {
    return profile?.role === 'team_principal' || profile?.role === 'administrator';
  };

  const getSessionTypeBadge = (type: string) => {
    const colors = {
      practice: 'bg-blue-600 hover:bg-blue-700',
      qualifying: 'bg-yellow-600 hover:bg-yellow-700',
      race: 'bg-red-600 hover:bg-red-700',
      testing: 'bg-green-600 hover:bg-green-700'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-600 hover:bg-gray-700';
  };

  const getTireColor = (compound: string | null) => {
    if (!compound) return 'text-gray-400';
    const colors = {
      soft: 'text-red-400',
      medium: 'text-yellow-400',
      hard: 'text-white',
      intermediate: 'text-green-400',
      wet: 'text-blue-400'
    };
    return colors[compound as keyof typeof colors] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-lg">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Flag className="h-8 w-8 mr-3 text-blue-400" />
            Race Sessions
          </h1>
          <p className="text-gray-400 mt-2">
            {profile?.role === 'driver' ? 'View your race sessions' : 'Manage team race sessions'}
          </p>
        </div>
        {canCreateSessions() && (
          <Button
            onClick={() => navigate('/sessions/create')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        )}
      </div>

      <Card className="bg-gray-800/80 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Session History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="p-8 text-center">
              <Flag className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No sessions found</p>
              {canCreateSessions() && (
                <Button
                  onClick={() => navigate('/sessions/create')}
                  className="mt-4 bg-green-600 hover:bg-green-700"
                >
                  Create Your First Session
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300">Track</TableHead>
                  <TableHead className="text-gray-300">Lap Time</TableHead>
                  <TableHead className="text-gray-300">Tires</TableHead>
                  {(profile?.role === 'team_principal' || profile?.role === 'race_engineer' || profile?.role === 'administrator') && (
                    <TableHead className="text-gray-300">Driver</TableHead>
                  )}
                  <TableHead className="text-gray-300">Date</TableHead>
                  {(canEditSessions() || canDeleteSessions()) && (
                    <TableHead className="text-gray-300">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className="border-gray-700 hover:bg-gray-700/50">
                    <TableCell>
                      <Badge className={getSessionTypeBadge(session.session_type)}>
                        {session.session_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-medium">
                      {session.track_name}
                    </TableCell>
                    <TableCell className="text-green-400 font-mono">
                      {session.lap_time ? `${session.lap_time}s` : '-'}
                    </TableCell>
                    <TableCell className={getTireColor(session.tire_compound)}>
                      {session.tire_compound || '-'}
                    </TableCell>
                    {(profile?.role === 'team_principal' || profile?.role === 'race_engineer' || profile?.role === 'administrator') && (
                      <TableCell className="text-gray-300">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{session.profiles?.full_name}</span>
                          {session.profiles?.car_number && (
                            <span className="text-red-400">#{session.profiles.car_number}</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-gray-400">
                      {new Date(session.created_at).toLocaleDateString()}
                    </TableCell>
                    {(canEditSessions() || canDeleteSessions()) && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {canEditSessions() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/sessions/edit/${session.id}`)}
                              className="border-blue-600 text-blue-400 hover:bg-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteSessions() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(session.id)}
                              className="border-red-600 text-red-400 hover:bg-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Sessions;
