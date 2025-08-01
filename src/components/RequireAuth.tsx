import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile === null) {
      navigate('/auth');
    }
  }, [profile, loading]);

  if (loading || profile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-lg">Loading profile...</div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
