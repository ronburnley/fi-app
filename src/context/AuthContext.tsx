/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { GUEST_MODE_KEY } from '../constants/defaults';

// Check if we should bypass auth for local development
const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

// Mock user for dev bypass mode
const MOCK_USER: User = {
  id: 'dev-user-123',
  email: 'dev@localhost',
  app_metadata: {},
  user_metadata: { full_name: 'Dev User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(DEV_BYPASS_AUTH ? MOCK_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!DEV_BYPASS_AUTH);
  // Always start as non-guest so users see the login page (with disclaimers) on every visit.
  // Guest data remains in localStorage and loads when the user clicks "Get Started".
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Skip auth check in dev bypass mode
    if (DEV_BYPASS_AUTH) {
      console.log('[Auth] Dev bypass mode enabled - skipping authentication');
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Auto-exit guest mode if user is authenticated
      if (session?.user) {
        setIsGuest(false);
        localStorage.removeItem(GUEST_MODE_KEY);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // Auto-exit guest mode when user signs in
        if (session?.user) {
          setIsGuest(false);
          localStorage.removeItem(GUEST_MODE_KEY);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
    // Clear guest mode on sign out - return to landing page
    setIsGuest(false);
    localStorage.removeItem(GUEST_MODE_KEY);
  };

  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      console.error('Delete account error:', error);
      throw error;
    }
    // Sign out and clear local state after server-side deletion
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsGuest(false);
    localStorage.removeItem(GUEST_MODE_KEY);
  };

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
    localStorage.setItem(GUEST_MODE_KEY, 'true');
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
    localStorage.removeItem(GUEST_MODE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isGuest,
      signInWithGoogle,
      signOut,
      deleteAccount,
      enterGuestMode,
      exitGuestMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
