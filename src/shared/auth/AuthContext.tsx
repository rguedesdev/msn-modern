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
import {
  ApiError,
  clearSession,
  getSession,
  saveSession,
  type ApiUser,
} from "../api/client";
import { registerCurrentDevice } from "../api/e2ee";

interface AuthContextValue {
  user: ApiUser | null;
  isLoading: boolean;
  signIn(email: string, password: string, rememberMe: boolean): Promise<void>;
  signUp(email: string, displayName: string, password: string): Promise<void>;
  updateProfile(profile: Partial<Pick<
    ApiUser,
    "displayName" | "personalMessage" | "profileFrame" | "nameEffect"
  >>): Promise<void>;
  updateAvatar(file: File): Promise<void>;
  removeAvatar(): Promise<void>;
  updatePersonalMessage(personalMessage: string): Promise<void>;
  updatePassword(currentPassword: string, newPassword: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(() => getSession()?.user ?? null);
  const [isLoading, setIsLoading] = useState(() => getSession() !== null);

  useEffect(() => {
    const synchronizeSession = () => setUser(getSession()?.user ?? null);
    window.addEventListener("msn-auth-changed", synchronizeSession);
    window.addEventListener("storage", synchronizeSession);
    return () => {
      window.removeEventListener("msn-auth-changed", synchronizeSession);
      window.removeEventListener("storage", synchronizeSession);
    };
  }, []);

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
      .catch((error) => {
        if (cancelled) return;
        if (
          !getSession() ||
          (error instanceof ApiError && (error.status === 401 || error.status === 404))
        ) {
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

  const signIn = useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => {
    const session = await authApi.login(email, password, rememberMe);
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

  const updateProfile = useCallback(async (
    profile: Partial<Pick<
      ApiUser,
      "displayName" | "personalMessage" | "profileFrame" | "nameEffect"
    >>,
  ) => {
    const updatedUser = await authApi.updateProfile(profile);
    const session = getSession();
    if (session) saveSession({ ...session, user: updatedUser });
    setUser(updatedUser);
  }, []);

  const updateAvatar = useCallback(async (file: File) => {
    const avatarUrl = await authApi.uploadAvatar(file);
    const session = getSession();
    if (!session) return;
    const updatedUser = { ...session.user, avatarUrl };
    saveSession({ ...session, user: updatedUser });
    setUser(updatedUser);
  }, []);

  const removeAvatar = useCallback(async () => {
    await authApi.removeAvatar();
    const session = getSession();
    if (!session) return;
    const updatedUser = { ...session.user, avatarUrl: "" };
    saveSession({ ...session, user: updatedUser });
    setUser(updatedUser);
  }, []);

  const updatePersonalMessage = useCallback(async (personalMessage: string) => {
    await updateProfile({ personalMessage });
  }, [updateProfile]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authApi.updatePassword(currentPassword, newPassword);
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signIn,
      signUp,
      updateProfile,
      updateAvatar,
      removeAvatar,
      updatePersonalMessage,
      updatePassword,
      signOut,
    }),
    [isLoading, removeAvatar, signIn, signOut, signUp, updateAvatar, updatePassword, updatePersonalMessage, updateProfile, user],
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
