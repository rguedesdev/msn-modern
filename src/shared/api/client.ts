import type {
  NameEffect,
  ProfileFrame,
  ProfileStyleKey,
} from "../constants/ProfileStyle/page";

export interface ApiUser {
  id: string;
  email: string;
  displayName: string;
  personalMessage: string;
  avatarUrl: string;
  profileFrame: ProfileFrame;
  nameEffect: NameEffect;
  ownedProfileFrames: ProfileStyleKey[];
  ownedNameEffects: ProfileStyleKey[];
}

export interface AuthSession {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "")
  ?? "http://127.0.0.1:3333";
const SESSION_KEY = "msn-modern:session";
const REFRESH_LOCK_NAME = "msn-modern:refresh-session";

let refreshPromise: Promise<AuthSession | null> | null = null;

export class ApiError extends Error {
  readonly status: number;

  constructor(
    status: number,
    message: string,
  ) {
    super(message);
    this.status = status;
  }
}

export function getSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (value && !localStorage.getItem(SESSION_KEY)) localStorage.setItem(SESSION_KEY, value);
    return value ? JSON.parse(value) as AuthSession : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("msn-auth-changed"));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("msn-auth-changed"));
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    return body.error ?? `Erro HTTP ${response.status}`;
  } catch {
    return `Erro HTTP ${response.status}`;
  }
}

async function performSessionRefresh(
  expiredSession: AuthSession,
): Promise<AuthSession | null> {
  const currentSession = getSession();
  if (!currentSession) return null;

  // Outra requisição ou janela pode ter renovado a sessão enquanto aguardávamos.
  if (currentSession.refreshToken !== expiredSession.refreshToken) return currentSession;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
    });
  } catch {
    throw new ApiError(0, `Não foi possível conectar ao backend em ${API_URL}`);
  }

  if (!response.ok) {
    const latestSession = getSession();
    if (latestSession?.refreshToken !== currentSession.refreshToken) {
      return latestSession;
    }
    if (response.status === 401) {
      clearSession();
      return null;
    }
    throw new ApiError(response.status, await readError(response));
  }

  const latestSession = getSession();
  if (!latestSession || latestSession.refreshToken !== currentSession.refreshToken) {
    return latestSession;
  }

  const tokens = await response.json() as Omit<AuthSession, "user">;
  const refreshed = { ...tokens, user: currentSession.user };
  saveSession(refreshed);
  return refreshed;
}

export function refreshSession(
  expiredSession: AuthSession,
): Promise<AuthSession | null> {
  if (refreshPromise) return refreshPromise;

  const refresh = () => performSessionRefresh(expiredSession);
  refreshPromise = (navigator.locks
    ? navigator.locks.request(REFRESH_LOCK_NAME, refresh)
    : refresh()
  ).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retryAfterRefresh = true,
): Promise<T> {
  const session = getSession();
  const headers = new Headers(init.headers);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (session) headers.set("Authorization", `Bearer ${session.accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, `Não foi possível conectar ao backend em ${API_URL}`);
  }

  if (response.status === 401 && session && retryAfterRefresh) {
    const refreshed = await refreshSession(session);
    if (refreshed) return apiRequest<T>(path, init, false);
  }
  if (!response.ok) throw new ApiError(response.status, await readError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function resolveApiAssetUrl(path: string | undefined): string {
  if (!path) return "";
  if (/^(?:data:|https?:)/.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export { API_URL };
