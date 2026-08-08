import fullAsset from "@/assets/branding/ascend-logo-full.png.asset.json";
import wordmarkAsset from "@/assets/branding/ascend-wordmark.png.asset.json";
import symbolAsset from "@/assets/branding/ascend-symbol.png.asset.json";

type Props = { className?: string; alt?: string };

/** Logo completa (símbolo + palavra). Usar em login, splash e institucional. */
export function AscendLogoFull({ className = "h-28 w-auto", alt = "ASCEND" }: Props) {
  return (
    <img
      src={fullAsset.url}
      alt={alt}
      className={`select-none object-contain ${className}`}
      draggable={false}
    />
  );
}

/** Apenas a palavra ASCEND. Usar em navbars e cabeçalhos. */
export function AscendWordmark({ className = "h-6 w-auto", alt = "ASCEND" }: Props) {
  return (
    <img
      src={wordmarkAsset.url}
      alt={alt}
      className={`select-none object-contain ${className}`}
      draggable={false}
    />
  );
}

/** Apenas o símbolo geométrico. Usar em ícones, loading e elementos compactos. */
export function AscendSymbol({ className = "size-8", alt = "ASCEND" }: Props) {
  return (
    <img
      src={symbolAsset.url}
      alt={alt}
      className={`select-none object-contain ${className}`}
      draggable={false}
    />
  );
}

export const ascendBrandUrls = {
  full: fullAsset.url,
  wordmark: wordmarkAsset.url,
  symbol: symbolAsset.url,
};
