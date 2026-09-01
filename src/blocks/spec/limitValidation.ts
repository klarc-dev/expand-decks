export function serializedTextLength(value: unknown): number {
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value))
    return value.reduce((total, item) => total + serializedTextLength(item), 0);
  if (!value || typeof value !== 'object') return 0;

  const record = value as Record<string, unknown>;
  const ownText = typeof record.text === 'string' ? record.text.length : 0;
  return ownText + serializedTextLength(record.children) + serializedTextLength(record.root);
}

export function validateSerializedTextLength(value: unknown, max: number): true | string {
  const length = serializedTextLength(value);
  return length <= max
    ? true
    : `Le contenu est limité à ${max} caractères visibles (${length} actuellement).`;
}
