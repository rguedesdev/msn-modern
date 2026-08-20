import { useEffect, useState } from "react";
import {
  loadApiAssetUrl,
  requiresNativeApiAsset,
  resolveApiAssetUrl,
} from "../api/client";

interface LoadedAsset {
  source: string;
  url: string;
}

export function useApiAssetUrl(path: string | undefined): string {
  const source = resolveApiAssetUrl(path);
  const requiresNativeLoad = requiresNativeApiAsset(source);
  const [loadedAsset, setLoadedAsset] = useState<LoadedAsset>({ source: "", url: "" });

  useEffect(() => {
    if (!requiresNativeLoad) return;

    let active = true;
    void loadApiAssetUrl(source)
      .then((url) => {
        if (active) setLoadedAsset({ source, url });
      })
      .catch((error) => {
        console.error("Não foi possível carregar a imagem da API:", error);
      });

    return () => {
      active = false;
    };
  }, [requiresNativeLoad, source]);

  if (!requiresNativeLoad) return source;
  return loadedAsset.source === source ? loadedAsset.url : "";
}
