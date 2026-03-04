import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Dashboard from '@/pages/Dashboard';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isMobile = useIsMobile();
  const { role, loading: roleLoading } = useUserRole();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setAuthLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading || (session && (roleLoading || role === null))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Default: redirect all users to client dashboard
  // Consultor on desktop gets the suite dashboard
  if (role === 'consultor' && !isMobile) {
    return (
      <DashboardLayout>
        <Dashboard />
      </DashboardLayout>
    );
  }

  // Produtor or consultor on mobile → client dashboard
  return <Navigate to="/client" replace />;
};

export default Index;
