import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";

const SupabaseAuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncAppUser = useCallback(
    async (user) => {
      if (!user) return;

      try {
        const { data: appUser, error: appUserError } = await supabase
          .from("app_users")
          .select("id")
          .eq("uuid", user.id)
          .maybeSingle();

        if (appUserError) {
          console.error("Erro ao consultar app_users:", appUserError);
          return;
        }

        if (!appUser) {
          const { error: insertError } = await supabase.from("app_users").insert({
            uuid: user.id,
            name: user.user_metadata?.name || user.email,
            email: user.email,
            username: user.email,
            password: "password_placeholder",
          });

          if (insertError) {
            console.error("Erro ao criar perfil em app_users:", insertError);
            toast({
              variant: "destructive",
              title: "Erro ao sincronizar perfil",
              description: insertError.message,
            });
          } else {
            console.log("Usuário sincronizado com app_users");
          }
        }
      } catch (err) {
        console.error("Erro inesperado ao sincronizar app_users:", err);
      }
    },
    [toast]
  );

  const applySession = useCallback((currentSession) => {
    console.log("Sessão recebida:", currentSession);
    setSession(currentSession);
    setAuthUser(currentSession?.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;
        if (!mounted) return;

        applySession(currentSession);

        if (currentSession?.user) {
          syncAppUser(currentSession.user);
        }
      } catch (err) {
        console.error("Erro ao obter sessão:", err);
        if (!mounted) return;
        applySession(null);
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log("Evento de autenticação:", event);

      if (!mounted) return;

      applySession(currentSession);

      if (currentSession?.user) {
        syncAppUser(currentSession.user);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [applySession, syncAppUser]);

  const signUp = useCallback(
    async (email, password) => {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no cadastro",
          description: error.message,
        });
      } else {
        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu e-mail para confirmar o acesso.",
        });
      }

      return { data, error };
    },
    [toast]
  );

  const signIn = useCallback(
    async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({
          variant: "destructive",
          title: "Falha no login",
          description: error.message,
        });
      }

      return { error };
    },
    [toast]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message,
      });
    }
  }, [toast]);

  const value = useMemo(
    () => ({ authUser, session, loading, signUp, signIn, signOut }),
    [authUser, session, loading, signUp, signIn, signOut]
  );

  return (
    <SupabaseAuthContext.Provider value={value}>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-screen text-gray-600">
          <p className="animate-pulse">🔄 Inicializando autenticação...</p>
          <small className="text-muted-foreground mt-2">
            Verificando sessão do usuário...
          </small>
        </div>
      ) : (
        children
      )}
    </SupabaseAuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider />");
  }
  return context;
};