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
  signInWithGoogle: (role?: UserRole) => Promise<{ error: string | null }>;
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
          let profile = await fetchProfile(session.user.id);

          // For Google OAuth users: update profile with Google metadata if needed
          if (session.user.app_metadata?.provider === 'google') {
            const md = session.user.user_metadata || {};
            const newName = md.full_name || md.name || '';
            const newAvatar = md.avatar_url || md.picture || '';
            const needsUpdate = profile && (
              (!profile.full_name || profile.full_name === 'User') && newName
            ) || (
              !profile?.avatar_url && newAvatar
            );
            if (needsUpdate && profile) {
              const updates: Record<string, any> = {};
              if (newName && (!profile.full_name || profile.full_name === 'User')) updates.full_name = newName;
              if (newAvatar && !profile.avatar_url) updates.avatar_url = newAvatar;
              if (Object.keys(updates).length > 0) {
                await supabase.from('profiles').update(updates).eq('id', session.user.id);
                profile = await fetchProfile(session.user.id);
              }
            }
          }

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
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          let profile = await fetchProfile(session.user.id);

          // For Google OAuth users: update profile from metadata + role from URL state
          if (session.user.app_metadata?.provider === 'google' && event === 'SIGNED_IN') {
            const md = session.user.user_metadata || {};
            const newName = md.full_name || md.name || '';
            const newAvatar = md.avatar_url || md.picture || '';
            const updates: Record<string, any> = {};
            if (newName && (!profile || !profile.full_name || profile.full_name === 'User')) updates.full_name = newName;
            if (newAvatar && (!profile || !profile.avatar_url)) updates.avatar_url = newAvatar;
            // Read role from URL query params (passed during OAuth)
            const urlParams = new URLSearchParams(window.location.search);
            const googleRole = urlParams.get('google_role');
            if (googleRole && (googleRole === 'freelancer' || googleRole === 'client') && profile && profile.role !== googleRole) {
              updates.role = googleRole;
            }
            if (Object.keys(updates).length > 0) {
              await supabase.from('profiles').update(updates).eq('id', session.user.id);
              profile = await fetchProfile(session.user.id);
              // Clean up URL params
              window.history.replaceState({}, '', window.location.pathname);
            }
          }

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

  // ── Sign In with Google ──────────────────────────────────────
  const signInWithGoogle = useCallback(async (role?: UserRole) => {
    try {
      const redirectBase = window.location.origin + '/dashboard';
      const redirectTo = role ? `${redirectBase}?google_role=${role}` : redirectBase;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: role ? { role } : undefined,
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Google sign in failed' };
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
    signInWithGoogle,
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
