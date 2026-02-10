import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

/** Redirects anonymous users from /compose to Gallery when Supabase is configured */
export function ComposeGuard({ children }: { children: React.ReactNode }) {
  const { user, isConfigured } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isConfigured && !user) {
      toast.info('Sign in to compose and save sequences');
    }
  }, [isConfigured, user]);

  if (isConfigured && !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
