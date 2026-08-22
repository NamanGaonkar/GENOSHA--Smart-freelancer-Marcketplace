import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';
import type { Session, User } from '@supabase/supabase-js';

// ============================================================
// AUTH CONTEXT TYPES
// ============================================================

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  role: UserRole | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    role: null,
  });

  // Fetch profile from the profiles table
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Failed to fetch profile:', error?.message);
      return null;
    }

    return data as Profile;
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (!mounted) return;

          setState({
            session,
            user: session.user,
            profile,
            loading: false,
            role: profile?.role ?? null,
          });
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setState(prev => ({ ...prev, loading: false }));
        }
      }
    }

    init();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (!mounted) return;

          setState({
            session,
            user: session.user,
            profile,
            loading: false,
            role: profile?.role ?? null,
          });
        } else {
          setState({
            session: null,
            user: null,
            profile: null,
            loading: false,
            role: null,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ── Sign In ──────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign in failed' };
    }
  }, []);

  // ── Sign Up ──────────────────────────────────────────────────
  const signUp = useCallback(async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            full_name: fullName,
          },
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign up failed' };
    }
  }, []);

  // ── Sign Out ─────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      session: null,
      user: null,
      profile: null,
      loading: false,
      role: null,
    });
  }, []);

  // ── Refresh Profile ──────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (state.user) {
      const profile = await fetchProfile(state.user.id);
      if (profile) {
        setState(prev => ({
          ...prev,
          profile,
          role: profile.role,
        }));
      }
    }
  }, [state.user, fetchProfile]);

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================
// HOOK
// ============================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
