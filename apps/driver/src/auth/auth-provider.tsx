import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, loading: false });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/**
 * The driver app is only for active members with the `driver` role. RLS already limits what a
 * driver can read; this check gives a clear message instead of an empty app.
 */
export async function isActiveDriver(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('role', 'driver')
    .eq('is_active', true)
    .limit(1);
  return !error && (data?.length ?? 0) > 0;
}
