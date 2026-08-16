import {
  apiRequest,
  clearSession,
  getSession,
  saveSession,
  type ApiUser,
  type AuthSession,
} from "./client";

export async function login(email: string, password: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveSession(session);
  return session;
}

export async function register(
  email: string,
  displayName: string,
  password: string,
): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, displayName, password }),
  });
  saveSession(session);
  return session;
}

export async function getMe(): Promise<ApiUser> {
  const response = await apiRequest<{ user: ApiUser }>("/me");
  return response.user;
}

export async function logout(): Promise<void> {
  const session = getSession();
  clearSession();
  if (!session) return;
  try {
    await apiRequest<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
  } catch {
    // A sessão local já foi encerrada; falha de rede não deve impedir o logout.
  }
}
