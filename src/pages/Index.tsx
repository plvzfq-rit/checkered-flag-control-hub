
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 flex items-center justify-center">
        <div className="text-white text-lg">Starting engines...</div>
      </div>
    );
  }

  return user ? <Navigate to="/" replace /> : <Navigate to="/auth" replace />;
};

export default Index;
