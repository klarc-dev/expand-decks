export const INFORMATIONAL_STYLE_PROMPT = `Style rédactionnel obligatoire :
- Registre factuel et informationnel : décrire, expliquer, comparer, quantifier.
- Aucun slogan, aucune accroche publicitaire, aucune formule "catchy".
- Aucun superlatif ni adjectif décoratif : remplace-les par des faits, limites, dates, chiffres, sources ou conditions.
- Si le brief contient une promesse marketing, reformule-la comme une affirmation vérifiable ; si elle n'est pas étayée, omets-la.
- Pas de point d'exclamation.`;

const SKIPPED_KEYS = new Set([
  'code',
  'href',
  'id',
  'image',
  'imageurl',
  'rawbrief',
  'source',
  'sources',
  'src',
  'url',
]);

// Terms are matched against accent-folded, lowercased text, so accented
// variants (e.g. "révolutionnaire") are covered by their folded form below.
const BANNED_TERMS = [
  // French — superlatives / advertising copy
  'accrocheur',
  'boostez',
  'change la donne',
  'disruptif',
  'exceptionnel',
  'extraordinaire',
  'incroyable',
  'incontournable',
  'inegale',
  'innovant',
  'leader',
  'liberez',
  'meilleur',
  'meilleure',
  'numero 1',
  'puissant',
  'revolutionnaire',
  'sans precedent',
  'transformez',
  'ultime',
  'unique',
  // English — common marketing phrases
  'amazing',
  'best in class',
  'best-in-class',
  'boost',
  'catchy',
  'cutting edge',
  'cutting-edge',
  'game changer',
  'game-changing',
  'next gen',
  'next-gen',
  'revolutionary',
  'seamless',
  'state of the art',
  'state-of-the-art',
  'ultimate',
  'unlock',
  'unmatched',
  'unparalleled',
  'world class',
  'world-class',
] as const;

export class StylePolicyError extends Error {
  constructor(readonly violations: string[]) {
    super(`Generated text violates the informational style policy: ${violations.join('; ')}`);
    this.name = 'StylePolicyError';
  }
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termPattern(term: string): RegExp {
  const tokens = normalizeText(term)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(escapeRegExp);
  return new RegExp(`(^|[^a-z0-9])${tokens.join('[^a-z0-9]+')}(?=$|[^a-z0-9])`, 'i');
}

const TERM_PATTERNS = BANNED_TERMS.map((term) => ({ term, pattern: termPattern(term) }));

function shouldSkip(path: string[]): boolean {
  const key = path
    .at(-1)
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return key ? SKIPPED_KEYS.has(key) : false;
}

function formatPath(path: string[]): string {
  return path.length ? path.join('.') : '(racine)';
}

function visit(value: unknown, path: string[], violations: Set<string>): void {
  if (typeof value === 'string') {
    if (shouldSkip(path)) return;

    const normalized = normalizeText(value);
    for (const { term, pattern } of TERM_PATTERNS) {
      if (pattern.test(normalized)) {
        violations.add(`${formatPath(path)} : terme promotionnel ou superlatif "${term}"`);
      }
    }
    if (value.includes('!')) {
      violations.add(`${formatPath(path)} : point d'exclamation`);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      visit(item, [...path, String(index)], violations);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      visit(child, [...path, key], violations);
    }
  }
}

export function findInformationalStyleViolations(value: unknown): string[] {
  const violations = new Set<string>();
  visit(value, [], violations);
  return [...violations];
}
