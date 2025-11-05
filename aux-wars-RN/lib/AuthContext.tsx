import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import SpotifyService from './spotifyService';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isSpotifyConnected: boolean;
  connectSpotify: () => Promise<void>;
  disconnectSpotify: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkSpotifyConnection();
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkSpotifyConnection();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSpotifyConnection = async () => {
    const connected = await SpotifyService.isAuthenticated();
    setIsSpotifyConnected(connected);
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) throw error;

      // Create user record in public.users table
      if (data.user) {
        const { error: insertError } = await supabase.from('users').insert({
          id: data.user.id,
          email,
          username,
          password: '', // Not storing password in public table (handled by Supabase Auth)
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        if (insertError) {
          console.error('Error creating user record:', insertError);
        }
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await SpotifyService.logout();
      setIsSpotifyConnected(false);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const connectSpotify = async () => {
    try {
      await SpotifyService.loginWithSpotify();
      await checkSpotifyConnection();
    } catch (error: any) {
      console.error('Spotify connection error:', error);
      throw error;
    }
  };

  const disconnectSpotify = async () => {
    try {
      await SpotifyService.logout();
      setIsSpotifyConnected(false);
    } catch (error: any) {
      console.error('Spotify disconnect error:', error);
      throw error;
    }
  };

  const value = {
    session,
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isSpotifyConnected,
    connectSpotify,
    disconnectSpotify,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

