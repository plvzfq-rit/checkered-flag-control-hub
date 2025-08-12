
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, Plus, Trash2, Zap } from 'lucide-react';

interface PitStop {
  id: string;
  pit_time: number | null;
  tire_change_from: string | null;
  tire_change_to: string | null;
  fuel_added: number | null;
  lap_number: number | null;
  created_at: string;
  race_sessions?: {
    track_name: string;
    session_type: string;
  };
  profiles?: {
    full_name: string;
    car_number: number | null;
  };
}

interface RaceSession {
  id: string;
  track_name: string;
  session_type: string;
}

const PitStops: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [pitStops, setPitStops] = useState<PitStop[]>([]);
  const [sessions, setSessions] = useState<RaceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    session_id: '',
    pit_time: '',
    tire_change_from: '',
    tire_change_to: '',
    fuel_added: '',
    lap_number: ''
  });

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    try {
      await Promise.all([fetchPitStops(), fetchSessions()]);
    } catch (error) {
      console.error('Error fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPitStops = async () => {
    try {
      let query = supabase
        .from('pit_stops')
        .select(`
          *,
          race_sessions (
            track_name,
            session_type
          ),
          profiles (
            full_name,
            car_number
          )
        `)
        .order('created_at', { ascending: false });

      if (profile?.role === 'driver') {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPitStops(data || []);
    } catch (error) {
      console.error('Error fetching pit stops.');
      toast({
        title: "Error",
        description: "Failed to fetch pit stops",
        variant: "destructive"
      });
    }
  };

  const fetchSessions = async () => {
    try {
      let query = supabase
        .from('race_sessions')
        .select('id, track_name, session_type')
        .order('created_at', { ascending: false });

      if (profile?.role === 'driver') {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const pitStopData = {
        session_id: formData.session_id,
        user_id: profile?.id,
        pit_time: formData.pit_time ? parseFloat(formData.pit_time) : null,
        tire_change_from: formData.tire_change_from || null,
        tire_change_to: formData.tire_change_to || null,
        fuel_added: formData.fuel_added ? parseFloat(formData.fuel_added) : null,
        lap_number: formData.lap_number ? parseInt(formData.lap_number) : null
      };

      const { error } = await supabase
        .from('pit_stops')
        .insert([pitStopData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pit stop recorded successfully"
      });

      setFormData({
        session_id: '',
        pit_time: '',
        tire_change_from: '',
        tire_change_to: '',
        fuel_added: '',
        lap_number: ''
      });
      setShowForm(false);
      fetchPitStops();
    } catch (error) {
      console.error('Error creating pit stop.');
      toast({
        title: "Error",
        description: "Failed to record pit stop",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (pitStopId: string) => {
    if (!confirm('Are you sure you want to delete this pit stop?')) return;

    try {
      const { error } = await supabase
        .from('pit_stops')
        .delete()
        .eq('id', pitStopId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pit stop deleted successfully"
      });

      fetchPitStops();
    } catch (error) {
      console.error('Error deleting pit stop.');
      toast({
        title: "Error",
        description: "Failed to delete pit stop",
        variant: "destructive"
      });
    }
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
        <div className="text-white text-lg">Loading pit stops...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Clock className="h-8 w-8 mr-3 text-orange-400" />
            Pit Stops
          </h1>
          <p className="text-gray-400 mt-2">
            Track pit stop performance and strategy
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Pit Stop
        </Button>
      </div>

      {showForm && (
        <Card className="bg-gray-800/80 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Zap className="h-5 w-5 mr-2 text-orange-400" />
              Record New Pit Stop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session_id" className="text-gray-300">Race Session</Label>
                  <Select
                    value={formData.session_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, session_id: value }))}
                    required
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.track_name} - {session.session_type.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pit_time" className="text-gray-300">Pit Time (seconds)</Label>
                  <Input
                    id="pit_time"
                    type="number"
                    step="0.01"
                    value={formData.pit_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, pit_time: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="2.34"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tire_change_from" className="text-gray-300">Tire From</Label>
                  <Select
                    value={formData.tire_change_from}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tire_change_from: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select compound" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="soft">Soft</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="wet">Wet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tire_change_to" className="text-gray-300">Tire To</Label>
                  <Select
                    value={formData.tire_change_to}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tire_change_to: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select compound" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="soft">Soft</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="wet">Wet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel_added" className="text-gray-300">Fuel Added (kg)</Label>
                  <Input
                    id="fuel_added"
                    type="number"
                    step="0.1"
                    value={formData.fuel_added}
                    onChange={(e) => setFormData(prev => ({ ...prev, fuel_added: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="25.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lap_number" className="text-gray-300">Lap Number</Label>
                  <Input
                    id="lap_number"
                    type="number"
                    value={formData.lap_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, lap_number: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Record Pit Stop
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gray-800/80 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Pit Stop History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pitStops.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No pit stops recorded</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Session</TableHead>
                  <TableHead className="text-gray-300">Pit Time</TableHead>
                  <TableHead className="text-gray-300">Tire Change</TableHead>
                  <TableHead className="text-gray-300">Fuel Added</TableHead>
                  <TableHead className="text-gray-300">Lap</TableHead>
                  {(profile?.role === 'team_principal' || profile?.role === 'race_engineer') && (
                    <TableHead className="text-gray-300">Driver</TableHead>
                  )}
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pitStops.map((pitStop) => (
                  <TableRow key={pitStop.id} className="border-gray-700 hover:bg-gray-700/50">
                    <TableCell className="text-white">
                      <div>
                        <div className="font-medium">{pitStop.race_sessions?.track_name}</div>
                        <div className="text-sm text-gray-400">
                          {pitStop.race_sessions?.session_type.toUpperCase()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-orange-400 font-mono">
                      {pitStop.pit_time ? `${pitStop.pit_time}s` : '-'}
                    </TableCell>
                    <TableCell>
                      {pitStop.tire_change_from && pitStop.tire_change_to ? (
                        <div className="flex items-center space-x-2">
                          <span className={getTireColor(pitStop.tire_change_from)}>
                            {pitStop.tire_change_from}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className={getTireColor(pitStop.tire_change_to)}>
                            {pitStop.tire_change_to}
                          </span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-blue-400">
                      {pitStop.fuel_added ? `${pitStop.fuel_added}kg` : '-'}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {pitStop.lap_number ? `Lap ${pitStop.lap_number}` : '-'}
                    </TableCell>
                    {(profile?.role === 'team_principal' || profile?.role === 'race_engineer') && (
                      <TableCell className="text-gray-300">
                        <div className="flex items-center space-x-2">
                          <span>{pitStop.profiles?.full_name}</span>
                          {pitStop.profiles?.car_number && (
                            <span className="text-red-400">#{pitStop.profiles.car_number}</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(pitStop.id)}
                        className="border-red-600 text-red-400 hover:bg-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
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

export default PitStops;
