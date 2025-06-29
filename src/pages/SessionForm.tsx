
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Clock } from 'lucide-react';

const SessionForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    session_type: 'practice',
    track_name: '',
    lap_time: '',
    sector_1: '',
    sector_2: '',
    sector_3: '',
    tire_compound: 'medium',
    fuel_load: '',
    weather_conditions: '',
    notes: ''
  });

  const isEditing = Boolean(id);

  useEffect(() => {
    if (isEditing) {
      fetchSession();
    }
  }, [id]);

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from('race_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setFormData({
        session_type: data.session_type,
        track_name: data.track_name,
        lap_time: data.lap_time?.toString() || '',
        sector_1: data.sector_1?.toString() || '',
        sector_2: data.sector_2?.toString() || '',
        sector_3: data.sector_3?.toString() || '',
        tire_compound: data.tire_compound || 'medium',
        fuel_load: data.fuel_load?.toString() || '',
        weather_conditions: data.weather_conditions || '',
        notes: data.notes || ''
      });
    } catch (error) {
      console.error('Error fetching session:', error);
      toast({
        title: "Error",
        description: "Failed to fetch session data",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const sessionData = {
        session_type: formData.session_type,
        track_name: formData.track_name,
        lap_time: formData.lap_time ? parseFloat(formData.lap_time) : null,
        sector_1: formData.sector_1 ? parseFloat(formData.sector_1) : null,
        sector_2: formData.sector_2 ? parseFloat(formData.sector_2) : null,
        sector_3: formData.sector_3 ? parseFloat(formData.sector_3) : null,
        tire_compound: formData.tire_compound,
        fuel_load: formData.fuel_load ? parseFloat(formData.fuel_load) : null,
        weather_conditions: formData.weather_conditions,
        notes: formData.notes,
        user_id: profile?.id
      };

      let error;
      if (isEditing) {
        const result = await supabase
          .from('race_sessions')
          .update(sessionData)
          .eq('id', id);
        error = result.error;
      } else {
        const result = await supabase
          .from('race_sessions')
          .insert([sessionData]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Session ${isEditing ? 'updated' : 'created'} successfully`
      });

      navigate('/sessions');
    } catch (error) {
      console.error('Error saving session:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} session`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => navigate('/sessions')}
          className="text-gray-800 bg-gray-100 border-gray-300 hover:bg-gray-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>
        <h1 className="text-3xl font-bold text-white">
          {isEditing ? 'Edit Session' : 'New Race Session'}
        </h1>
      </div>

      <Card className="bg-gray-800/80 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-400" />
            Session Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="session_type" className="text-gray-300">Session Type</Label>
                <Select value={formData.session_type} onValueChange={(value) => handleChange('session_type', value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="practice">Practice</SelectItem>
                    <SelectItem value="qualifying">Qualifying</SelectItem>
                    <SelectItem value="race">Race</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="track_name" className="text-gray-300">Track Name</Label>
                <Input
                  id="track_name"
                  value={formData.track_name}
                  onChange={(e) => handleChange('track_name', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="e.g., Monaco Grand Prix"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lap_time" className="text-gray-300">Lap Time (seconds)</Label>
                <Input
                  id="lap_time"
                  type="number"
                  step="0.001"
                  value={formData.lap_time}
                  onChange={(e) => handleChange('lap_time', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="87.234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tire_compound" className="text-gray-300">Tire Compound</Label>
                <Select value={formData.tire_compound} onValueChange={(value) => handleChange('tire_compound', value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sector_1" className="text-gray-300">Sector 1 (seconds)</Label>
                <Input
                  id="sector_1"
                  type="number"
                  step="0.001"
                  value={formData.sector_1}
                  onChange={(e) => handleChange('sector_1', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="24.567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sector_2" className="text-gray-300">Sector 2 (seconds)</Label>
                <Input
                  id="sector_2"
                  type="number"
                  step="0.001"
                  value={formData.sector_2}
                  onChange={(e) => handleChange('sector_2', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="31.123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sector_3" className="text-gray-300">Sector 3 (seconds)</Label>
                <Input
                  id="sector_3"
                  type="number"
                  step="0.001"
                  value={formData.sector_3}
                  onChange={(e) => handleChange('sector_3', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="31.544"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fuel_load" className="text-gray-300">Fuel Load (kg)</Label>
                <Input
                  id="fuel_load"
                  type="number"
                  step="0.1"
                  value={formData.fuel_load}
                  onChange={(e) => handleChange('fuel_load', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="105.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weather_conditions" className="text-gray-300">Weather Conditions</Label>
                <Input
                  id="weather_conditions"
                  value={formData.weather_conditions}
                  onChange={(e) => handleChange('weather_conditions', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Sunny, 25°C, Dry"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-300">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white min-h-24"
                placeholder="Session notes, setup changes, observations..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/sessions')}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : isEditing ? 'Update Session' : 'Create Session'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionForm;
