import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, AlertTriangle } from 'lucide-react';

interface LastLoginInfoProps {
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  failedLoginCount: number;
  showAsToast?: boolean;
}

const LastLoginInfo: React.FC<LastLoginInfoProps> = ({ 
  lastLoginAt, 
  lastLoginIp, 
  failedLoginCount,
  showAsToast = false 
}) => {
  if (!lastLoginAt) return null;

  const lastLogin = new Date(lastLoginAt);
  const now = new Date();
  const diffMs = now.getTime() - lastLogin.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  const getTimeAgo = () => {
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const content = (
    <div className="flex items-center space-x-4 text-sm">
      <div className="flex items-center space-x-2">
        <Clock className="h-4 w-4 text-blue-400" />
        <span className="text-gray-300">
          Last login: {getTimeAgo()}
        </span>
      </div>
      
      {lastLoginIp && (
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-green-400" />
          <span className="text-gray-300">
            IP: {lastLoginIp}
          </span>
        </div>
      )}
      
      {failedLoginCount > 0 && (
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <span className="text-yellow-400">
            {failedLoginCount} failed attempt{failedLoginCount > 1 ? 's' : ''} since last login
          </span>
        </div>
      )}
    </div>
  );

  if (showAsToast) {
    return content;
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="pt-4">
        {content}
      </CardContent>
    </Card>
  );
};

export default LastLoginInfo;