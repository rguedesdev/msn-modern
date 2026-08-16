import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "../api/auth";
import { clearSession, getSession, saveSession, type ApiUser } from "../api/client";
import { registerCurrentDevice } from "../api/e2ee";

interface AuthContextValue {
  user: ApiUser | null;
  isLoading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, displayName: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(() => getSession()?.user ?? null);
  const [isLoading, setIsLoading] = useState(() => getSession() !== null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      return;
    }

    let cancelled = false;
    void authApi.getMe()
      .then((currentUser) => {
        if (cancelled) return;
        const refreshedSession = getSession();
        if (refreshedSession) saveSession({ ...refreshedSession, user: currentUser });
        setUser(currentUser);
        void registerCurrentDevice(currentUser.id).catch((error) => {
          console.error("Não foi possível registrar a chave E2EE do dispositivo:", error);
        });
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await authApi.login(email, password);
    setUser(session.user);
    void registerCurrentDevice(session.user.id).catch((error) => {
      console.error("Não foi possível registrar a chave E2EE do dispositivo:", error);
    });
  }, []);

  const signUp = useCallback(async (email: string, displayName: string, password: string) => {
    const session = await authApi.register(email, displayName, password);
    setUser(session.user);
    void registerCurrentDevice(session.user.id).catch((error) => {
      console.error("Não foi possível registrar a chave E2EE do dispositivo:", error);
    });
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signUp, signOut }),
    [isLoading, signIn, signOut, signUp, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// O provider e o hook vivem juntos para manter um único contrato de autenticação.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return context;
}
