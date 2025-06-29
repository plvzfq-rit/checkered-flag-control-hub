
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Save, Key, Trophy } from 'lucide-react';

const Profile: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    team_name: profile?.team_name || '',
    car_number: profile?.car_number?.toString() || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        full_name: formData.full_name,
        team_name: formData.team_name || null,
        car_number: formData.car_number ? parseInt(formData.car_number) : null
      };

      const { error } = await updateProfile(updates);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
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
      default:
        return role;
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-lg">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center">
          <User className="h-8 w-8 mr-3 text-blue-400" />
          Profile Settings
        </h1>
        <p className="text-gray-400 mt-2">
          Manage your account information and preferences
        </p>
      </div>

      <Card className="bg-gray-800/80 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-400" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div>
              <Label className="text-gray-300">Email Address</Label>
              <p className="text-white font-medium">{profile.email}</p>
            </div>
            <Badge className={getRoleBadgeColor(profile.role)}>
              {getRoleDisplayName(profile.role)}
            </Badge>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-gray-300">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team_name" className="text-gray-300">Team Name</Label>
              <Input
                id="team_name"
                value={formData.team_name}
                onChange={(e) => setFormData(prev => ({ ...prev, team_name: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="e.g., Red Bull Racing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="car_number" className="text-gray-300">Car Number</Label>
              <Input
                id="car_number"
                type="number"
                value={formData.car_number}
                onChange={(e) => setFormData(prev => ({ ...prev, car_number: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="33"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/80 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Key className="h-5 w-5 mr-2 text-yellow-400" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <Label className="text-gray-300">Password</Label>
                <p className="text-gray-400 text-sm">Last updated: Never</p>
              </div>
              <Button
                variant="outline"
                className="border-yellow-600 text-yellow-400 hover:bg-yellow-900"
                disabled
              >
                Change Password
              </Button>
            </div>
            <p className="text-gray-500 text-sm">
              Password management is handled through Supabase Auth. 
              Contact your Team Principal for password reset assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
