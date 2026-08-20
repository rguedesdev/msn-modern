import type { ReactNode } from "react";
import { useApiAssetUrl } from "../../hooks/useApiAssetUrl";
import {
  CONTACT_STATUS_FRAMES,
  type ContactStatus,
} from "../ContactStatusFrame/page";
import {
  PROFILE_STYLE_BACKGROUNDS,
  type ProfileFrame,
} from "../ProfileStyle/page";

interface PictureFrameProps {
  frame?: ProfileFrame;
  status?: ContactStatus;
  imageSrc?: string;
  imageAlt?: string;
  displayName?: string;
  imageSize?: number;
  fallback?: ReactNode;
}

function PictureFrame({
  frame = "status",
  status = "online",
  imageSrc,
  imageAlt = "Foto de perfil",
  displayName = "Usuário",
  imageSize = 100,
  fallback,
}: PictureFrameProps) {
  const displayedImageSrc = useApiAssetUrl(imageSrc);
  const initial = displayName.trim().charAt(0).toLocaleUpperCase("pt-BR") || "U";
  const isCustomFrame = frame !== "status";
  const frameBackground = frame === "status"
    ? CONTACT_STATUS_FRAMES[status].background
    : PROFILE_STYLE_BACKGROUNDS[frame];

  return (
    <div className="relative shrink-0 self-start p-[6px]">
      <div
        className={`absolute inset-0 rounded-xl ${
          isCustomFrame ? "animate-[gradientMove_4s_linear_infinite]" : ""
        }`}
        style={{
          background: frameBackground,
          backgroundSize: isCustomFrame ? "300% 100%" : "100% 100%",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          padding: "8px" /* Espessura da borda */,
        }}
      />
      {fallback ?? (displayedImageSrc ? (
        <img
          className="relative z-10 block rounded-lg object-cover"
          style={{ height: imageSize, width: imageSize }}
          src={displayedImageSrc}
          alt={imageAlt}
        />
      ) : (
        <div
          role="img"
          aria-label={imageAlt}
          className="relative z-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#e7f6f2] via-[#ccebe5] to-[#a9d3e4] font-bold text-[#438d73] shadow-inner"
          style={{
            height: imageSize,
            width: imageSize,
            fontSize: Math.max(20, Math.round(imageSize * 0.42)),
          }}
        >
          {initial}
        </div>
      ))}
    </div>
  );
}

export { PictureFrame };
