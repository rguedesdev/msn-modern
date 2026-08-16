export type ContactStatus = "online" | "ocupado" | "ausente" | "offline";

export const CONTACT_STATUS_FRAMES: Record<
  ContactStatus,
  { label: string; background: string }
> = {
  online: {
    label: "Online",
    background: "linear-gradient(135deg, #baf3d2, #34b879 48%, #087d4b)",
  },
  ocupado: {
    label: "Ocupado",
    background: "linear-gradient(135deg, #ffd0d0, #e25555 48%, #a91f32)",
  },
  ausente: {
    label: "Ausente",
    background: "linear-gradient(135deg, #fff2ad, #e8bd35 48%, #b17b08)",
  },
  offline: {
    label: "Offline",
    background: "linear-gradient(135deg, #eef2f4, #aebbc2 48%, #758690)",
  },
};

export function toContactStatus(value: string): ContactStatus {
  return value === "online" || value === "ocupado" || value === "ausente"
    ? value
    : "offline";
}
