import fullAsset from "@/assets/branding/ascend-logo-v2.png.asset.json";
import wordmarkAsset from "@/assets/branding/ascend-wordmark-v2.png.asset.json";
import symbolAsset from "@/assets/branding/ascend-symbol-v2.png.asset.json";

type Props = { className?: string; alt?: string };

/** Dimensões intrínsecas reais dos arquivos oficiais (px). */
const DIMS = {
  full: { w: 406, h: 208 },
  wordmark: { w: 411, h: 33 },
  symbol: { w: 245, h: 205 },
} as const;

/** Base compartilhada: altura controla o tamanho, largura sempre automática. Sem efeitos. */
const BASE = "block max-w-full select-none object-contain";
const AUTO_W = { width: "auto" } as const;

/** Logo completa (símbolo + palavra). Usar em login, splash e institucional. */
export function AscendLogoFull({ className = "h-24 sm:h-32", alt = "ASCEND" }: Props) {
  return (
    <img
      src={fullAsset.url}
      alt={alt}
      width={DIMS.full.w}
      height={DIMS.full.h}
      style={{ ...AUTO_W, aspectRatio: `${DIMS.full.w} / ${DIMS.full.h}` }}
      className={`${BASE} ${className}`}
      draggable={false}
    />
  );
}

/** Apenas a palavra ASCEND. Usar em navbars e cabeçalhos. */
export function AscendWordmark({ className = "h-5 sm:h-6", alt = "ASCEND" }: Props) {
  return (
    <img
      src={wordmarkAsset.url}
      alt={alt}
      width={DIMS.wordmark.w}
      height={DIMS.wordmark.h}
      style={{ ...AUTO_W, aspectRatio: `${DIMS.wordmark.w} / ${DIMS.wordmark.h}` }}
      className={`${BASE} ${className}`}
      draggable={false}
    />
  );
}

/** Apenas o símbolo geométrico. Usar em ícones, loading e elementos compactos. */
export function AscendSymbol({ className = "h-8", alt = "ASCEND" }: Props) {
  return (
    <img
      src={symbolAsset.url}
      alt={alt}
      width={DIMS.symbol.w}
      height={DIMS.symbol.h}
      style={{ ...AUTO_W, aspectRatio: `${DIMS.symbol.w} / ${DIMS.symbol.h}` }}
      className={`${BASE} shrink-0 ${className}`}
      draggable={false}
    />
  );
}

export const ascendBrandUrls = {
  full: fullAsset.url,
  wordmark: wordmarkAsset.url,
  symbol: symbolAsset.url,
};
