
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Trophy, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900">
      <header className="bg-black/90 backdrop-blur-sm border-b border-red-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Trophy className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-white">Checkered Flag Control Hub</h1>
            </div>
            
            {profile && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-3 bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700">
                  <User className="h-4 w-4 text-gray-300" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white leading-tight">{profile.full_name}</span>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getRoleBadgeColor(profile.role)} text-xs px-2 py-0`}>
                        {getRoleDisplayName(profile.role)}
                      </Badge>
                      {profile.team_name && (
                        <span className="text-xs text-gray-400">{profile.team_name}</span>
                      )}
                      {profile.car_number && (
                        <span className="text-xs text-red-400 font-bold">#{profile.car_number}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/profile')}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="border-red-600 text-red-400 hover:bg-red-900 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
