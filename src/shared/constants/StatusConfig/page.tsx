export const STATUS_CONFIG = {
  online: { label: "Online", color: "bg-green-500" },
  ocupado: { label: "Ocupado", color: "bg-red-500" },
  ausente: { label: "Ausente", color: "bg-yellow-400" },
  invisivel: { label: "Invisível", color: "bg-zinc-200" },
};

export type UserStatus = keyof typeof STATUS_CONFIG;

export const LOGIN_STATUS_STORAGE_KEY = "msn-login-status";

export function getStatusOptionClassName(isSelected: boolean): string {
  const baseClassName =
    "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-xs transition-colors";

  return `${baseClassName} ${
    isSelected
      ? "border-[#3b96bd] bg-[#dff2fa] font-semibold text-[#245f7b] shadow-[0_0_0_1px_rgba(59,150,189,0.18)]"
      : "border-transparent bg-transparent text-[#52758a] hover:bg-white/65"
  }`;
}

export function isUserStatus(value: string | null): value is UserStatus {
  return Boolean(value && value in STATUS_CONFIG);
}
