import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { isCompanyUser } from '@/utils/roleUtils';

interface CompanyProtectedRouteProps {
  children: ReactNode;
}

export function CompanyProtectedRoute({ children }: CompanyProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isCompanyUser(user)) {
    // Redirect non-company users to explore page
    return <Navigate to="/explore" replace />;
  }

  return <>{children}</>;
}

