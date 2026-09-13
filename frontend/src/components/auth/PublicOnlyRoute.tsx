import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-bright">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    let from = location.state?.from?.pathname;
    
    // Prevent open redirect by ensuring the path is relative and not a double-slash URL
    if (from && (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//'))) {
      from = null;
    }

    if (from) {
      return <Navigate to={from} replace />;
    }

    if (user?.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/account/dashboard" replace />;
  }

  return <>{children}</>;
};
