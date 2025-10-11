import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const useAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = () => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (!adminAuth || !loginTime) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }

    // Check if session is expired (24 hours)
    const loginDate = new Date(loginTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      // Session expired, clear storage
      localStorage.removeItem('adminAuthenticated');
      localStorage.removeItem('adminLoginTime');
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }

    setIsAuthenticated(true);
    setIsLoading(false);
    return true;
  };

  const requireAuth = () => {
    if (isLoading) {
      return false; // Still checking
    }

    if (!isAuthenticated) {
      toast({
        title: "Access Denied",
        description: "Please log in to access the admin panel.",
        variant: "destructive",
      });
      navigate('/admin/login');
      return false;
    }

    return true;
  };

  const logout = () => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminLoginTime');
    setIsAuthenticated(false);
    toast({
      title: "Logged Out",
      description: "You have been logged out of the admin panel.",
    });
    navigate('/admin/login');
  };

  return {
    isAuthenticated,
    isLoading,
    requireAuth,
    logout,
    checkAdminAuth
  };
};
