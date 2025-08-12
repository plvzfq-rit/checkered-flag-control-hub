import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Edit, Shield, UserPlus } from 'lucide-react';
import TeamSelector from '@/components/TeamSelector';
import { fetchTeamById, Team } from '@/services/teamsService';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'team_principal' | 'race_engineer' | 'driver' | 'administrator';
  team_id: string | null;
  car_number: number | null;
  created_at: string;
  teams?: {
    id: string;
    name: string;
    full_name: string;
    short_code: string | null;
    created_at: string;
  };
}

const UserManagement: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'driver',
    team_id: '',
    car_number: ''
  });

  useEffect(() => {
    if (profile?.role === 'administrator') {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          teams (
            id,
            name,
            full_name,
            short_code,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const userData = {
        full_name: formData.full_name,
        role: formData.role as "administrator" | "team_principal" | "race_engineer" | "driver",
        team_id: formData.team_id || null,
        car_number: formData.car_number ? parseInt(formData.car_number) : null
      };

      if (editingUser) {
        const { error } = await supabase
          .from('profiles')
          .update(userData)
          .eq('id', editingUser.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "User updated successfully"
        });
      } else {
        toast({
          title: "Info",
          description: "User creation requires email invitation system",
          variant: "default"
        });
        return;
      }

      setFormData({
        email: '',
        full_name: '',
        role: 'driver',
        team_id: '',
        car_number: ''
      });
      setEditingUser(null);
      setShowForm(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: "Failed to save user",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      team_id: user.team_id || '',
      car_number: user.car_number?.toString() || ''
    });
    setShowForm(true);
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

  if (profile?.role !== 'administrator') {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">Only Administrators can manage users.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-lg">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Users className="h-8 w-8 mr-3 text-green-400" />
            User Management
          </h1>
          <p className="text-gray-400 mt-2">
            Manage team members and their roles
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null);
            setFormData({
              email: '',
              full_name: '',
              role: 'driver',
              team_id: '',
              car_number: ''
            });
            setShowForm(!showForm);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {showForm && (
        <Card className="bg-gray-800/80 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-green-400" />
              {editingUser ? 'Edit User' : 'Add New User'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="user@example.com"
                    disabled={!!editingUser}
                    required={!editingUser}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-gray-300">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-gray-300">Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: 'administrator' | 'team_principal' | 'race_engineer' | 'driver') => 
                      setFormData(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="race_engineer">Race Engineer</SelectItem>
                      <SelectItem value="team_principal">Team Principal</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <TeamSelector
                  value={formData.team_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, team_id: value }))}
                  label="Team"
                  placeholder="Select a team"
                  displayFullName={true}
                />

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
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {editingUser ? 'Update User' : 'Add User'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gray-800/80 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Team Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Name</TableHead>
                  <TableHead className="text-gray-300">Email</TableHead>
                  <TableHead className="text-gray-300">Role</TableHead>
                  <TableHead className="text-gray-300">Team</TableHead>
                  <TableHead className="text-gray-300">Car #</TableHead>
                  <TableHead className="text-gray-300">Joined</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-gray-700 hover:bg-gray-700/50">
                    <TableCell className="text-white font-medium">
                      {user.full_name}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {user.teams?.name || '-'}
                    </TableCell>
                    <TableCell className="text-red-400">
                      {user.car_number ? `#${user.car_number}` : '-'}
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(user)}
                        className="border-blue-600 text-blue-400 hover:bg-blue-900"
                      >
                        <Edit className="h-4 w-4" />
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

export default UserManagement;
