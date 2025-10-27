import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Renamed from 'user' to 'authUser' to avoid confusion with app_users profile
  const [authUser, setAuthUser] = useState(null);

  const handleSession = useCallback(async (currentSession) => {
    setSession(currentSession);
    setAuthUser(currentSession?.user ?? null);

    if (currentSession?.user) {
      // Check if user exists in app_users, if not, create it
      const { data: appUser, error: appUserError } = await supabase
        .from('app_users')
        .select('id')
        .eq('uuid', currentSession.user.id)
        .single();

      if (appUserError && appUserError.code === 'PGRST116') { // Not found
        const { error: insertError } = await supabase.from('app_users').insert({
          uuid: currentSession.user.id,
          name: currentSession.user.user_metadata?.name || currentSession.user.email,
          email: currentSession.user.email,
          username: currentSession.user.email,
          password: 'password_placeholder', // Not used for login
        });

        if (insertError) {
          console.error("Failed to auto-create user profile:", insertError);
          toast({
            variant: "destructive",
            title: "Falha na Sincronização",
            description: "Não foi possível criar o perfil do usuário automaticamente.",
          });
        }
      }
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        await handleSession(session);
      } catch (error) {
        if (error.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut();
        }
        await handleSession(null);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          await handleSession(null);
        } else if (session) {
          await handleSession(session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { data, error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    authUser,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }), [authUser, session, loading, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};