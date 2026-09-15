/** Organisation palette roles plus the existing surface-aware pill treatment. */
export const PILL_VARIANTS = ['default', 'primary', 'secondary', 'ink', 'paper'] as const;
export type PillVariant = (typeof PILL_VARIANTS)[number];

export const PILL_VARIANT_OPTIONS = [
  { label: 'Automatique (selon le fond)', value: 'default' },
  { label: 'Primaire', value: 'primary' },
  { label: 'Secondaire', value: 'secondary' },
  { label: 'Texte', value: 'ink' },
  { label: 'Fond', value: 'paper' },
] satisfies { label: string; value: PillVariant }[];
