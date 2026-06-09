export function KlarcMark({ size = 28 }: { size?: number }) {
  // Inline SVG at a fixed size gains nothing from next/image (no optimization
  // for SVG, and it needs dangerouslyAllowSVG) — a plain img is correct here.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/klarc-logomark.svg" alt="Klarc" style={{ width: size, height: size }} />;
}
