import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastAuthEventRef = useRef<string>('');
  const lastAuthTimeRef = useRef<number>(0);

  useEffect(() => {
    let isInitialized = false;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Debounce rapid auth state changes
        const now = Date.now();
        const eventKey = `${event}-${session?.user?.id || 'null'}`;
        
        // Skip if same event within 100ms (rapid fire protection)
        if (eventKey === lastAuthEventRef.current && (now - lastAuthTimeRef.current) < 100) {
          return; // Skip duplicate events
        }
        
        lastAuthEventRef.current = eventKey;
        lastAuthTimeRef.current = now;
        
        // Only log significant auth events, not every state change
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          // Only log if this is a new event (not a duplicate)
          console.log('Auth state change:', event, session?.user?.id);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        isInitialized = true;
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isInitialized) {
        console.log('Initial session check:', session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        isInitialized = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    // Enforce email confirmation before allowing login
    const user = data?.user;
    if (user && !user.email_confirmed_at) {
      // Immediately sign out unconfirmed users to clear any session
      await supabase.auth.signOut();
      return {
        error: {
          message: 'Please confirm your email address before signing in. Check your inbox for the verification link.',
        } as any,
      };
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    console.log('Starting signOut process...');
    
    // Manually clear the user state FIRST to ensure immediate logout
    console.log('Clearing user state...');
    setUser(null);
    setSession(null);
    
    // Clear any admin session data that might interfere with user logout
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminLoginTime');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminUser');
    
    // Clear all Supabase-related localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear Supabase session
    console.log('Calling Supabase signOut...');
    await supabase.auth.signOut();
    
    // Force clear any remaining session data
    console.log('Refreshing session...');
    await supabase.auth.refreshSession();
    
    console.log('SignOut process completed');
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}