import type { CSSProperties } from 'react';

/** Convert scoped theme CSS emitted by buildThemeCss into React inline variables. */
export function candidateThemeVariables(themeCss?: string): CSSProperties {
  if (!themeCss) return {};
  const declarations = themeCss.match(/--[\w-]+:\s*[^;]+;/g) ?? [];
  return Object.fromEntries(
    declarations.map((declaration) => {
      const separator = declaration.indexOf(':');
      return [declaration.slice(0, separator).trim(), declaration.slice(separator + 1, -1).trim()];
    }),
  ) as CSSProperties;
}
