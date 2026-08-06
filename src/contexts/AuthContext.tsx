import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchMe, loginWithJwt, logoutJwt, signupWithJwt } from '@/api/auth';
import { ApiError } from '@/api/client';
import {
  ACCESS_TOKEN_KEY,
  USE_JWT_AUTH,
  getAccessToken,
  setAccessToken,
} from '@/api/config';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True when VITE_USE_JWT_AUTH=true (Railway JWT). Production default is false (Supabase). */
  useJwtAuth: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ data?: any; error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAppUser(id: string, email: string): User {
  // Minimal shape for consumers that only need id / email.
  return { id, email } as User;
}

function toAppSession(accessToken: string, user: User): Session {
  return {
    access_token: accessToken,
    token_type: 'bearer',
    user,
  } as Session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastAuthEventRef = useRef<string>('');
  const lastAuthTimeRef = useRef<number>(0);

  useEffect(() => {
    if (USE_JWT_AUTH) {
      let cancelled = false;

      const restoreJwtSession = async () => {
        const token = getAccessToken();
        if (!token) {
          if (!cancelled) {
            setUser(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }

        try {
          const me = await fetchMe();
          if (cancelled) return;
          const appUser = toAppUser(me.id, me.email);
          setUser(appUser);
          setSession(toAppSession(token, appUser));
        } catch {
          if (cancelled) return;
          setAccessToken(null);
          setUser(null);
          setSession(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      void restoreJwtSession();
      return () => {
        cancelled = true;
      };
    }

    let isInitialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        const now = Date.now();
        const eventKey = `${event}-${nextSession?.user?.id || 'null'}`;

        if (eventKey === lastAuthEventRef.current && (now - lastAuthTimeRef.current) < 100) {
          return;
        }

        lastAuthEventRef.current = eventKey;
        lastAuthTimeRef.current = now;

        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          console.log('Auth state change:', event, nextSession?.user?.id);
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
        isInitialized = true;
      }
    );

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (!isInitialized) {
        console.log('Initial session check:', existing?.user?.id);
        setSession(existing);
        setUser(existing?.user ?? null);
        setLoading(false);
        isInitialized = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (USE_JWT_AUTH) {
      try {
        const { access_token } = await loginWithJwt(email, password);
        setAccessToken(access_token);
        const me = await fetchMe();
        const appUser = toAppUser(me.id, me.email);
        setUser(appUser);
        setSession(toAppSession(access_token, appUser));
        return { error: null };
      } catch (err) {
        setAccessToken(null);
        setUser(null);
        setSession(null);
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Login failed';
        return { error: { message } };
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    const signedInUser = data?.user;
    if (signedInUser && !signedInUser.email_confirmed_at) {
      await supabase.auth.signOut();
      return {
        error: {
          message: 'Please confirm your email address before signing in. Check your inbox for the verification link.',
        } as any,
      };
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (USE_JWT_AUTH) {
      try {
        const name =
          (displayName && displayName.trim()) ||
          email.split('@')[0] ||
          'User';
        const { access_token } = await signupWithJwt(email, password, name);
        setAccessToken(access_token);
        const me = await fetchMe();
        const appUser = toAppUser(me.id, me.email);
        setUser(appUser);
        setSession(toAppSession(access_token, appUser));
        return { data: { user: appUser }, error: null };
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Signup failed';
        return { error: { message } };
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    console.log('Starting signOut process...');

    setUser(null);
    setSession(null);

    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminLoginTime');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminUser');
    localStorage.removeItem(ACCESS_TOKEN_KEY);

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });

    sessionStorage.clear();

    if (USE_JWT_AUTH) {
      try {
        await logoutJwt();
      } catch {
        // Stateless JWT — client discard is enough
      }
      console.log('JWT signOut process completed');
      return;
    }

    console.log('Calling Supabase signOut...');
    await supabase.auth.signOut();
    console.log('Refreshing session...');
    await supabase.auth.refreshSession();
    console.log('SignOut process completed');
  };

  const resetPassword = async (email: string) => {
    if (USE_JWT_AUTH) {
      return {
        error: {
          message: 'Password reset is not available yet for JWT auth. Contact an admin.',
        },
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    useJwtAuth: USE_JWT_AUTH,
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
