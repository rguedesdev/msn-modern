import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
const SESSION_PERSISTENCE_KEY = "msn-modern:session-persistence";
const SESSION_EXECUTION_KEY = "msn-modern:session-execution";
const REFRESH_LOCK_NAME = "msn-modern:refresh-session";

export type SessionPersistence = "local" | "session";

let refreshPromise: Promise<AuthSession | null> | null = null;
let sessionStorageInitialized = false;

const apiFetch: typeof fetch = isTauri()
  ? tauriFetch
  : globalThis.fetch.bind(globalThis);
const apiAssetUrls = new Map<string, Promise<string>>();

function createApiHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  if (new URL(API_URL).hostname.endsWith(".ngrok-free.app")) {
    headers.set("ngrok-skip-browser-warning", "true");
  }
  return headers;
}

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

function initializeSessionStorage(): void {
  if (sessionStorageInitialized || !isTauri()) return;
  sessionStorageInitialized = true;

  // Somente a janela principal decide se uma sessão temporária pertence à
  // execução atual. Janelas de chat compartilham a sessão, mas não a encerram.
  if (getCurrentWindow().label !== "main") return;

  const currentWindowSession = sessionStorage.getItem(SESSION_KEY);
  if (currentWindowSession) {
    // Migra sessões temporárias criadas antes do suporte a múltiplas janelas.
    localStorage.setItem(SESSION_KEY, currentWindowSession);
    localStorage.setItem(SESSION_PERSISTENCE_KEY, "session");
    sessionStorage.setItem(SESSION_EXECUTION_KEY, "active");
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }

  if (
    localStorage.getItem(SESSION_PERSISTENCE_KEY) === "session" &&
    sessionStorage.getItem(SESSION_EXECUTION_KEY) !== "active"
  ) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_PERSISTENCE_KEY);
  }
}

export function getSession(): AuthSession | null {
  try {
    initializeSessionStorage();
    const localSession = localStorage.getItem(SESSION_KEY);
    const persistence = localStorage.getItem(SESSION_PERSISTENCE_KEY);
    const canUseLocalSession = persistence === "local" || (
      isTauri() && persistence === "session"
    );

    // Sessões de versões anteriores eram persistidas sem consentimento.
    if (localSession && !canUseLocalSession) {
      localStorage.removeItem(SESSION_KEY);
    }

    const value = (canUseLocalSession ? localSession : null)
      ?? sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) as AuthSession : null;
  } catch {
    return null;
  }
}

function getSessionPersistence(): SessionPersistence | null {
  initializeSessionStorage();
  const persistence = localStorage.getItem(SESSION_PERSISTENCE_KEY);
  if (
    (persistence === "local" || (isTauri() && persistence === "session")) &&
    localStorage.getItem(SESSION_KEY)
  ) return persistence;
  if (sessionStorage.getItem(SESSION_KEY)) return "session";
  return null;
}

export function saveSession(
  session: AuthSession,
  persistence: SessionPersistence = getSessionPersistence() ?? "session",
): void {
  const serializedSession = JSON.stringify(session);
  if (persistence === "local") {
    localStorage.setItem(SESSION_KEY, serializedSession);
    localStorage.setItem(SESSION_PERSISTENCE_KEY, "local");
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_EXECUTION_KEY);
  } else if (isTauri()) {
    // localStorage é compartilhado pelas WebViews; o marcador em
    // sessionStorage limita a validade à execução da janela principal.
    localStorage.setItem(SESSION_KEY, serializedSession);
    localStorage.setItem(SESSION_PERSISTENCE_KEY, "session");
    sessionStorage.setItem(SESSION_EXECUTION_KEY, "active");
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, serializedSession);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_PERSISTENCE_KEY);
  }
  window.dispatchEvent(new Event("msn-auth-changed"));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_PERSISTENCE_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_EXECUTION_KEY);
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
    response = await apiFetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: createApiHeaders({ "Content-Type": "application/json" }),
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
  const headers = createApiHeaders(init.headers);
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
    response = await apiFetch(`${API_URL}${path}`, { ...init, headers });
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
  if (/^(?:blob:|data:|https?:)/.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function requiresNativeApiAsset(path: string | undefined): boolean {
  if (!isTauri() || !path) return false;
  const url = resolveApiAssetUrl(path);
  return url === API_URL || url.startsWith(`${API_URL}/`);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32_768;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function loadApiAssetUrl(path: string): Promise<string> {
  const url = resolveApiAssetUrl(path);
  if (!requiresNativeApiAsset(url)) return Promise.resolve(url);

  const cached = apiAssetUrls.get(url);
  if (cached) return cached;

  const pending = apiFetch(url, { headers: createApiHeaders() })
    .then(async (response) => {
      if (!response.ok) throw new ApiError(response.status, await readError(response));
      const contentType = response.headers.get("Content-Type")?.split(";", 1)[0].trim();
      if (!contentType?.startsWith("image/")) {
        throw new ApiError(response.status, "O backend não retornou uma imagem válida");
      }
      return `data:${contentType};base64,${arrayBufferToBase64(await response.arrayBuffer())}`;
    })
    .catch((error) => {
      apiAssetUrls.delete(url);
      throw error;
    });
  apiAssetUrls.set(url, pending);
  return pending;
}

export { API_URL };
