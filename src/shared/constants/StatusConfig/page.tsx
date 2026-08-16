export const STATUS_CONFIG = {
  online: { label: "Online", color: "bg-green-500" },
  ocupado: { label: "Ocupado", color: "bg-red-500" },
  ausente: { label: "Ausente", color: "bg-yellow-400" },
  invisivel: { label: "Invisível", color: "bg-zinc-200" },
};

export type UserStatus = keyof typeof STATUS_CONFIG;

export const LOGIN_STATUS_STORAGE_KEY = "msn-login-status";

export function isUserStatus(value: string | null): value is UserStatus {
  return Boolean(value && value in STATUS_CONFIG);
}
